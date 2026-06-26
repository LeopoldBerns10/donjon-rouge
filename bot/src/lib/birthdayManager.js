const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js')
const supabase = require('../supabase.js')

const BIRTHDAY_CHANNEL_ID = '1520034360559013939'
const CHEF_ROLE_ID        = '611123759864348672'
const LIE_ROLE_ID         = '1511096527664320655'

// ─── Handlers boutons ─────────────────────────────────────────────────────────

async function handleBirthdayRegister(interaction) {
  if (!interaction.member.roles.cache.has(LIE_ROLE_ID)) {
    return interaction.reply({ content: '❌ Tu dois être membre du clan pour t\'inscrire.', ephemeral: true })
  }

  const modal = new ModalBuilder()
    .setCustomId('modal_birthday_register')
    .setTitle('Inscription anniversaire')

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('birthday_date')
        .setLabel('Ta date d\'anniversaire (JJ/MM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 15/06')
        .setMinLength(4)
        .setMaxLength(5)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('birthday_year')
        .setLabel('Année de naissance (optionnel)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 1990')
        .setMinLength(4)
        .setMaxLength(4)
        .setRequired(false)
    )
  )

  await interaction.showModal(modal)
}

async function handleBirthdayUnregister(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data } = await supabase
    .from('birthdays')
    .select('id')
    .eq('discord_id', interaction.user.id)
    .maybeSingle()

  if (!data) return interaction.editReply('❌ Tu n\'es pas inscrit.')

  await supabase.from('birthdays').delete().eq('discord_id', interaction.user.id)
  await interaction.editReply('✅ Inscription supprimée.')
}

async function handleBirthdayList(interaction) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data: rows } = await supabase
    .from('birthdays')
    .select('discord_name, birth_day, birth_month')
    .order('birth_month', { ascending: true })
    .order('birth_day', { ascending: true })

  if (!rows?.length) return interaction.editReply('📋 Aucun membre inscrit.')

  const lines = rows.map(r => {
    const d = String(r.birth_day).padStart(2, '0')
    const m = String(r.birth_month).padStart(2, '0')
    return `${d}/${m} — ${r.discord_name}`
  })

  await interaction.editReply(`📋 Membres inscrits (${rows.length}) :\n\n${lines.join('\n')}`)
}

// ─── Handler modal ────────────────────────────────────────────────────────────

async function handleModalBirthdayRegister(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const raw   = interaction.fields.getTextInputValue('birthday_date').trim()
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})$/)

  if (!match) {
    return interaction.editReply('❌ Format invalide. Utilise JJ/MM (ex: 15/06).')
  }

  const day   = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return interaction.editReply('❌ Date invalide. Jour 1-31, mois 1-12.')
  }

  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')

  const yearRaw  = interaction.fields.getTextInputValue('birthday_year').trim()
  let birth_year = null
  if (yearRaw) {
    const y = parseInt(yearRaw, 10)
    if (isNaN(y) || y < 1900 || y > new Date().getFullYear()) {
      return interaction.editReply('❌ Année invalide.')
    }
    birth_year = y
  }

  await supabase.from('birthdays').upsert(
    {
      discord_id:   interaction.user.id,
      discord_name: interaction.member.displayName,
      birth_day:    day,
      birth_month:  month,
      birth_year,
    },
    { onConflict: 'discord_id' }
  )

  const yearSuffix = birth_year ? ` (né·e en ${birth_year})` : ''
  await interaction.editReply(
    `✅ Inscription validée ! Le clan te souhaitera ton anniversaire le ${dd}/${mm}${yearSuffix} 🎂`
  )
}

// ─── Souhaits automatiques ────────────────────────────────────────────────────

async function checkBirthdays(client) {
  const parisNow = new Date(Date.now() + 2 * 3600000)
  const day      = parisNow.getUTCDate()
  const month    = parisNow.getUTCMonth() + 1
  const yyyy     = parisNow.getUTCFullYear()

  const today   = `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const sentKey = `birthday_sent_${today}`

  const { data: already } = await supabase.from('bot_config').select('value').eq('key', sentKey).maybeSingle()
  if (already) return

  const { data: rows } = await supabase
    .from('birthdays')
    .select('discord_id, discord_name, birth_year')
    .eq('birth_day', day)
    .eq('birth_month', month)

  if (!rows?.length) {
    await supabase.from('bot_config').upsert({ key: sentKey, value: 'none', updated_at: new Date().toISOString() })
    return
  }

  const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null)
  if (!channel) return

  for (const { discord_id, discord_name, birth_year } of rows) {
    try {
      const member = channel.guild.members.cache.get(discord_id)
      if (!member) continue
      const ageSuffix = birth_year ? ` Tu as ${yyyy - birth_year} ans aujourd'hui` : ''
      await channel.send(
        `🎂 <@${discord_id}> Joyeux anniversaire !${ageSuffix}\n\nLe Donjon Rouge te souhaite une excellente journée ! 🐉🎉`
      )
      console.log(`[Birthdays] Souhait envoyé pour ${discord_name} (${discord_id})`)
    } catch (e) {
      console.error(`[Birthdays] Erreur souhait ${discord_id}:`, e)
    }
  }

  await supabase.from('bot_config').upsert({ key: sentKey, value: today, updated_at: new Date().toISOString() })
}

module.exports = {
  handleBirthdayRegister,
  handleBirthdayUnregister,
  handleBirthdayList,
  handleModalBirthdayRegister,
  checkBirthdays,
}
