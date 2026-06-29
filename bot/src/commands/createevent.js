const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createevent')
    .setDescription('Crée un événement Discord manuellement (Chef uniquement)'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_createevent')
      .setTitle('Créer un événement Discord')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('event_title')
          .setLabel('Titre')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('event_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('event_start')
          .setLabel('Date début (JJ/MM/YYYY HH:MM)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('01/07/2026 18:00')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('event_end')
          .setLabel('Date fin (JJ/MM/YYYY HH:MM)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('01/07/2026 20:00')
      ),
    )

    await interaction.showModal(modal)
  },
}
