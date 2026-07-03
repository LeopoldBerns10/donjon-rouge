const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js')
const supabase = require('../supabase.js')
const { log } = require('./botLogger.js')

const POLL_CHANNEL_ID = '1520034566532759633'
const CHEF_ROLE_ID    = '611123759864348672'
const LIE_ROLE_ID     = '1511096527664320655'

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildPollEmbed(poll, ended = false) {
  const votes      = poll.votes || {}
  const options    = poll.options || []
  const totalVotes = Object.keys(votes).length

  const counts = Array(options.length).fill(0)
  for (const idx of Object.values(votes)) {
    if (idx >= 0 && idx < counts.length) counts[idx]++
  }

  if (ended) {
    const ranked = options
      .map((opt, i) => ({ opt, count: counts[i] }))
      .sort((a, b) => b.count - a.count)

    const lines = ranked.map((item, rank) => {
      const pct  = totalVotes > 0 ? Math.round(item.count / totalVotes * 100) : 0
      const icon = rank === 0 ? '🏆' : '   '
      return `${icon} ${item.opt} — ${item.count} vote${item.count !== 1 ? 's' : ''} (${pct}%)`
    })

    return new EmbedBuilder()
      .setColor(0x2E7D32)
      .setTitle(`📊 SONDAGE TERMINÉ — ${poll.question}`)
      .setDescription(`${lines.join('\n')}\n\n👥 ${totalVotes} participant(s) • ✅ Terminé`)
      .setTimestamp()
  }

  const endsAt    = new Date(poll.ends_at)
  const hoursLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 3600000))

  const lines = options.map((opt, i) => {
    const count = counts[i]
    const pct   = totalVotes > 0 ? Math.round(count / totalVotes * 100) : 0
    return `${opt} — ${count} vote${count !== 1 ? 's' : ''} (${pct}%)`
  })

  return new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle(`📊 SONDAGE — ${poll.question}`)
    .setDescription(
      `${lines.join('\n')}\n\n👥 ${totalVotes} participant(s) • ⏰ Se termine dans ${hoursLeft}h\nCréé par <@${poll.creator_id}>`
    )
    .setTimestamp()
}

function buildPollComponents(pollId, options) {
  const rows = []
  for (let i = 0; i < options.length; i += 5) {
    const row = new ActionRowBuilder()
    const chunk = options.slice(i, i + 5)
    for (let j = 0; j < chunk.length; j++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote:${pollId}:${i + j}`)
          .setLabel(chunk[j].slice(0, 80))
          .setStyle(ButtonStyle.Primary)
      )
    }
    rows.push(row)
  }
  return rows
}

// ─── Handlers boutons ─────────────────────────────────────────────────────────

async function handlePollCreate(interaction) {
  if (!interaction.member.roles.cache.has(LIE_ROLE_ID)) {
    return interaction.reply({ content: '❌ Tu dois être membre du clan pour créer un sondage.', ephemeral: true })
  }

  const modal = new ModalBuilder()
    .setCustomId('modal_poll_create')
    .setTitle('Créer un sondage')

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('poll_question')
        .setLabel('Question')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('poll_options')
        .setLabel('Options (une par ligne, 2 à 20)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Option 1\nOption 2\nOption 3')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('poll_duration')
        .setLabel('Durée (ex: 24h, 48h, 72h)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('24h')
        .setMaxLength(10)
    )
  )

  await interaction.showModal(modal)
}

async function handlePollEnd(interaction) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('channel_id', POLL_CHANNEL_ID)
    .eq('ended', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!poll) return interaction.editReply('❌ Aucun sondage en cours.')

  await endPoll(poll, interaction.client)
  await interaction.editReply('✅ Sondage terminé.')
}

async function handlePollVote(interaction, pollId, optionIndex) {
  if (!interaction.member.roles.cache.has(LIE_ROLE_ID)) {
    return interaction.reply({ content: '❌ Tu dois être membre du clan pour voter.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .maybeSingle()

  if (!poll || poll.ended || new Date(poll.ends_at) <= new Date()) {
    return interaction.editReply('❌ Ce sondage est terminé.')
  }

  const optIdx = parseInt(optionIndex, 10)
  if (isNaN(optIdx) || optIdx < 0 || optIdx >= poll.options.length) {
    return interaction.editReply('❌ Option invalide.')
  }

  const existingVote = poll.votes?.[interaction.user.id]
  const changed      = existingVote !== undefined && existingVote !== optIdx
  const newVotes     = { ...(poll.votes || {}), [interaction.user.id]: optIdx }

  await supabase.from('polls').update({ votes: newVotes }).eq('id', poll.id)

  try {
    const channel = await interaction.client.channels.fetch(poll.channel_id).catch(() => null)
    if (channel) {
      const msg = await channel.messages.fetch(poll.message_id).catch(() => null)
      if (msg) {
        await msg.edit({
          embeds:     [buildPollEmbed({ ...poll, votes: newVotes })],
          components: buildPollComponents(poll.id, poll.options),
        })
      }
    }
  } catch (e) {
    console.error('[Poll] Erreur update embed vote:', e)
  }

  const optName = poll.options[optIdx]
  await interaction.editReply(
    changed
      ? `✅ Vote modifié pour **${optName}** !`
      : `✅ Vote enregistré pour **${optName}** !`
  )
}

// ─── Handler modal ────────────────────────────────────────────────────────────

async function handleModalPollCreate(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const question    = interaction.fields.getTextInputValue('poll_question').trim()
  const optionsRaw  = interaction.fields.getTextInputValue('poll_options').trim()
  const durationRaw = interaction.fields.getTextInputValue('poll_duration').trim()

  const options = optionsRaw.split('\n').map(l => l.trim()).filter(Boolean)
  if (options.length < 2 || options.length > 20) {
    return interaction.editReply('❌ Il faut entre 2 et 20 options.')
  }

  const durationMatch = durationRaw.match(/^(\d+)h$/i)
  if (!durationMatch) {
    return interaction.editReply('❌ Format de durée invalide. Utilise ex: 24h, 48h.')
  }
  const hours = parseInt(durationMatch[1], 10)
  if (hours < 1 || hours > 720) {
    return interaction.editReply('❌ Durée invalide (1h à 720h).')
  }

  const endsAt = new Date(Date.now() + hours * 3600000)

  const channel = await interaction.client.channels.fetch(POLL_CHANNEL_ID).catch(() => null)
  if (!channel) return interaction.editReply('❌ Salon introuvable.')

  // Insérer d'abord pour obtenir l'ID auto-incrémenté
  const { data: poll, error } = await supabase
    .from('polls')
    .insert({
      message_id: '0',
      channel_id: POLL_CHANNEL_ID,
      creator_id: interaction.user.id,
      question,
      options,
      votes:      {},
      ends_at:    endsAt.toISOString(),
    })
    .select()
    .single()

  if (error || !poll) {
    console.error('[Poll] Erreur insert:', error)
    return interaction.editReply('❌ Erreur lors de la création du sondage.')
  }

  const msg = await channel.send({
    embeds:     [buildPollEmbed({ ...poll, votes: {} })],
    components: buildPollComponents(poll.id, options),
  })

  await supabase.from('polls').update({ message_id: msg.id }).eq('id', poll.id)
  log(interaction.client, 'SONDAGE', `Sondage créé par ${interaction.user.username} : "${question}" (${hours}h)`).catch(() => {})
  await interaction.editReply(`✅ Sondage créé ! ${hours}h pour voter.`)
}

// ─── Fin de sondage ───────────────────────────────────────────────────────────

async function endPoll(poll, client) {
  await supabase.from('polls').update({ ended: true }).eq('id', poll.id)

  const votes      = poll.votes || {}
  const totalVotes = Object.keys(votes).length
  const counts     = Array(poll.options.length).fill(0)
  for (const idx of Object.values(votes)) {
    if (idx >= 0 && idx < counts.length) counts[idx]++
  }

  const maxCount   = Math.max(...counts, 0)
  const winnerIdx  = counts.indexOf(maxCount)
  const winnerName = poll.options[winnerIdx] ?? '?'
  const winnerPct  = totalVotes > 0 ? Math.round(maxCount / totalVotes * 100) : 0

  try {
    const channel = await client.channels.fetch(poll.channel_id).catch(() => null)
    if (!channel) return

    const msg = await channel.messages.fetch(poll.message_id).catch(() => null)
    if (msg) {
      await msg.edit({
        embeds:     [buildPollEmbed({ ...poll, ended: true }, true)],
        components: [],
      })
    }

    await channel.send(
      `🏁 Le sondage est terminé !\n\n🏆 Résultat : **${winnerName}** remporte le sondage avec ${maxCount} vote${maxCount !== 1 ? 's' : ''} (${winnerPct}%) !`
    )
  } catch (e) {
    console.error('[Poll] Erreur endPoll:', e)
  }

  console.log(`[Poll] Sondage ${poll.id} terminé — gagnant: ${winnerName} (${maxCount} votes)`)
  log(client, 'SONDAGE', `Sondage ${poll.id} terminé — gagnant: ${winnerName} (${maxCount} votes, ${winnerPct}%)`).catch(() => {})
}

// ─── Vérification automatique ─────────────────────────────────────────────────

async function checkExpiredPolls(client) {
  const { data: expired } = await supabase
    .from('polls')
    .select('*')
    .eq('ended', false)
    .lte('ends_at', new Date().toISOString())

  for (const poll of expired || []) {
    await endPoll(poll, client).catch(e => console.error('[Poll] Erreur fin auto:', e))
  }
}

module.exports = {
  handlePollCreate,
  handlePollEnd,
  handlePollVote,
  handleModalPollCreate,
  checkExpiredPolls,
}
