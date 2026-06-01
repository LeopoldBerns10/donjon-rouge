const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { CHANNELS } = require('../config/onboarding.js')

const REGLEMENT_TEXT = `# 🏰 Bienvenue sur le serveur Donjon Rouge
*L'accès aux salons ne sera effectif qu'après validation du règlement.*

## ⚔️ LE RESPECT
Interdit aux messages diffamatoires, abusifs, vulgaires, haineux, harcelants, obscènes, racistes, sexuellement orientés, menaçant la vie privée ou contraires aux lois.
> ❌ Sinon : **exclusion immédiate**
> ⚠️ Au bout de **7 jours d'inactivité** sans prévenir = exclusion

## 🏹 FONCTIONNEMENT GDC
- Lancement le **mardi soir 20h**
- Inscription sur le tchat COC **24h à 48h avant** ou sur le site
- Les **2 attaques sont OBLIGATOIRES**
- 1ère attaque : **miroir obligatoire** au lancement
- 2ème attaque : voir ⁠salle-des-conquêtes

> ❌ 1 attaque non-faite = remplacement + avertissement + pas de bonus
> ❌ 2 attaques non-faites = **expulsion du clan**

## 🏆 LIGUE DE CLAN (LDC)
- Inscription sur le site avec **2 GDC de qualification**
- Miroir obligatoire tout au long de la LDC

## 💎 JEUX DE CLANS (JDC)
- **10K** = challenge de champion
- **5K** = minimum demandé pour être actif
- **Moins de 5K** = votre place est en péril

## 🔥 LES RAIDS
- Tout raid commencé **doit être fini**
- Faire ses raids = grade **Aîné** pour 7 jours
- Ne pas les faire = place en péril

## 👑 LES GRADES
- **Chef Adjoint** : suivant les besoins du clan
- **Aîné** : voir section Raids

*Nota : En acceptant le règlement tu confirmes avoir pris connaissance du fonctionnement du clan.* 😀`

function buildReglementEmbed(text) {
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('📜 Règlement du Donjon Rouge')
    .setDescription(text)
}

async function sendReglement(client) {
  const channel = await client.channels.fetch(CHANNELS.REGLEMENT)
  if (!channel) throw new Error('Salon règlement introuvable.')

  const rowRoles = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('role_donjon_rouge')
      .setLabel('🏆 Je souhaite rejoindre le clan Donjon Rouge')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('role_visiteur')
      .setLabel('🤙 Je suis juste un simple visiteur')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('role_rien')
      .setLabel('💥 Rien du tout pour moi')
      .setStyle(ButtonStyle.Danger),
  )

  const rowEdit = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('edit_reglement')
      .setLabel('✏️ Modifier le règlement')
      .setStyle(ButtonStyle.Secondary),
  )

  await channel.send({ embeds: [buildReglementEmbed(REGLEMENT_TEXT)], components: [rowRoles, rowEdit] })
}

module.exports = { sendReglement, buildReglementEmbed, REGLEMENT_TEXT }
