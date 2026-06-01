const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require('discord.js')
const supabase = require('../supabase.js')
const { getClanMembers, getClanMembersDR2, getPlayer } = require('../cocApi.js')
const { handleMesPerformances, buildPlayerEmbed } = require('../utils/performances.js')

async function handleLierCompte(interaction) {
  await interaction.reply({
    content: 'Utilise la commande `/lier tag:#TONTAG` pour lier ton compte !',
    ephemeral: true,
  })
}

function buildMembersRow(members, customId, placeholder) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(members.slice(0, 25).map(m =>
        new StringSelectMenuOptionBuilder()
          .setLabel(m.name)
          .setValue(`${m.tag}:${customId}`)
          .setDescription(m.tag)
      ))
  )
}

async function handleStatsClan(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const [resDR1, resDR2] = await Promise.allSettled([getClanMembers(), getClanMembersDR2()])

  const membersDR1 = resDR1.status === 'fulfilled' ? (resDR1.value?.items ?? resDR1.value ?? []) : []
  const membersDR2 = resDR2.status === 'fulfilled' ? (resDR2.value?.items ?? resDR2.value ?? []) : []

  if (!membersDR1.length && !membersDR2.length) {
    return interaction.editReply({ content: '❌ Impossible de récupérer les membres des clans.' })
  }

  const rows = []
  if (membersDR1.length) rows.push(buildMembersRow(membersDR1, 'dr1', '🏰 DR1 — Donjon Rouge'))
  if (membersDR2.length) rows.push(buildMembersRow(membersDR2, 'dr2', '🏰 DR2 — Donjon Rouge II'))

  const response = await interaction.editReply({
    content: 'Sélectionne un guerrier :',
    components: rows,
  })

  let collected
  try {
    collected = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id,
      time: 30_000,
    })
  } catch {
    return interaction.editReply({ content: 'Temps écoulé.', components: [] })
  }

  await collected.deferUpdate()

  const [tag] = collected.values[0].split(':')

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', components: [] })
  }

  const { data: link } = await supabase
    .from('discord_links')
    .select('discord_id')
    .eq('coc_tag', tag)
    .maybeSingle()

  return interaction.editReply({ content: '', embeds: [buildPlayerEmbed(player, link?.discord_id ?? null)], components: [] })
}

const BUTTON_HANDLERS = {
  mes_performances: handleMesPerformances,
  voir_mon_compte:  handleMesPerformances,
  lier_compte:      handleLierCompte,
  stats_clan:       handleStatsClan,
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton()) {
      const handler = BUTTON_HANDLERS[interaction.customId]
      if (handler) {
        try {
          await handler(interaction)
        } catch (err) {
          console.error(`[Button] ${interaction.customId}:`, err)
          const payload = { content: 'Une erreur est survenue.', ephemeral: true }
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload)
          } else {
            await interaction.reply(payload)
          }
        }
      }
      return
    }

    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)
    if (!command) return

    try {
      await command.execute(interaction)
    } catch (err) {
      console.error(`Erreur commande /${interaction.commandName}:`, err)
      const payload = { content: 'Une erreur est survenue.', ephemeral: true }
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload)
      } else {
        await interaction.reply(payload)
      }
    }
  }
}
