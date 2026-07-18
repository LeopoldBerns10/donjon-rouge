require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')
const fs = require('fs')
const path = require('path')

const GUILD_ID = '610767309031866371'

// Overrides à ne JAMAIS toucher
const BOT_MEMBER  = '1510915723306729574'
const BOT_ROLE    = '1510925894892523610'
const MONDE_ROLE  = '1518667690246672456'

// CORRECTION : le spec indique 1434575482182963310 pour "Codeur" mais l'audit
// montre que c'est le rôle "Staff". Le vrai Codeur de Donjon Rouge = 1498003325063270591.
const R = {
  chef:       '611123759864348672',
  adjoint:    '1297318759396278425',
  recruteur:  '1421254471391907840',
  codeur:     '1498003325063270591',
  dr:         '611125112519000064',
  lie:        '1511096527664320655',
  visiteur:   '1072532916955009095',
  verifie:    '1511080481108660326',
  nonVerifie: '1350801589652422728',
  everyone:   '610767309031866371',
}

const F = PermissionsBitField.Flags

// helpers : génère un objet d'override rôle
function ow(id, allow = [], deny = []) {
  return { id, type: 'role', allow, deny }
}

// Récupère les overrides protégés d'un salon (bot membre, bot rôle, mondial bot)
function prot(channel) {
  const out = []
  for (const [, o] of channel.permissionOverwrites.cache) {
    if (
      (o.type === 1 && o.id === BOT_MEMBER) ||
      (o.type === 0 && (o.id === BOT_ROLE || o.id === MONDE_ROLE))
    ) {
      out.push({ id: o.id, type: o.type === 0 ? 'role' : 'member', allow: o.allow, deny: o.deny })
    }
  }
  return out
}

async function apply(ch, overrides, label) {
  if (!ch) { console.error(`  ✗ Salon introuvable : ${label}`); return }
  const all = [...prot(ch), ...overrides]
  await ch.permissionOverwrites.set(all, 'Refonte DR — PERMISSIONS_DISCORD.md')
  console.log(`  ✓ ${ch.name}`)
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()
  const g = id => guild.channels.cache.get(id)

  // ── BACKUP ─────────────────────────────────────────────────────────────────
  const backup = {}
  for (const [id, ch] of guild.channels.cache) {
    const ows = {}
    if (ch.permissionOverwrites?.cache) {
      for (const [, o] of ch.permissionOverwrites.cache) {
        ows[o.id] = { type: o.type, allow: o.allow.bitfield.toString(), deny: o.deny.bitfield.toString() }
      }
    }
    backup[id] = { name: ch.name, type: ch.type, overrides: ows }
  }
  const docsDir = path.join(__dirname, '../../docs')
  fs.mkdirSync(docsDir, { recursive: true })
  fs.writeFileSync(path.join(docsDir, 'permissions_backup.json'), JSON.stringify(backup, null, 2))
  console.log('✅ Backup → bot/docs/permissions_backup.json\n')

  console.log('=== APPLICATION DES PERMISSIONS ===\n')

  // ── TICKETS (sans catégorie) ───────────────────────────────────────────────
  console.log('📋 Tickets')
  await apply(g('1446604754045239417'), [
    ow(R.everyone,   [F.ViewChannel]),
    ow(R.nonVerifie, [F.ViewChannel, F.SendMessages]),
    ow(R.visiteur,   [F.ViewChannel, F.SendMessages]),
  ], 'tickets')

  // ── INTÉGRATION ───────────────────────────────────────────────────────────
  console.log('\n📁 Intégration')
  await apply(g('1511081858723610684'), [
    ow(R.everyone,   [], [F.ViewChannel, F.Connect]),
    ow(R.verifie,    [F.ViewChannel, F.Connect]),
    ow(R.nonVerifie, [F.ViewChannel, F.Connect]),
  ], 'cat:intégration')

  await apply(g('1511079948956340355'), [
    ow(R.everyone,   [], [F.ViewChannel]),
    ow(R.nonVerifie, [F.ViewChannel, F.SendMessages]),
  ], '1-vérification')

  await apply(g('1511079308125536386'), [
    ow(R.everyone,   [], [F.ViewChannel]),
    ow(R.nonVerifie, [F.ViewChannel], [F.SendMessages]),
    ow(R.verifie,    [F.ViewChannel]),
    // Visiteur intentionnellement absent : après son choix il perd Vérifié mais garderait
    // l'accès via cet override — supprimer pour verrouiller le retour au salon règlement
  ], '2-lis-le-règlement')

  await apply(g('1510987282344317040'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.dr,       [F.ViewChannel, F.SendMessages, F.UseApplicationCommands]),
    ow(R.lie,      [F.ViewChannel, F.SendMessages, F.UseApplicationCommands]),
  ], '3-mon-compte')

  // ── INFOS CLASH & CLAN ────────────────────────────────────────────────────
  console.log('\n📁 Infos Clash & Clan')
  await apply(g('1443233659216855110'), [
    ow(R.everyone,   [], [F.ViewChannel, F.Connect]),
    ow(R.nonVerifie, [], [F.ViewChannel]),
    ow(R.dr,         [F.ViewChannel], [F.SendMessages, F.AddReactions]),
    ow(R.lie,        [F.ViewChannel, F.AddReactions], [F.SendMessages]),
    ow(R.recruteur,  [F.ViewChannel, F.AddReactions], [F.SendMessages]),
    ow(R.adjoint,    [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads, F.AddReactions]),
  ], 'cat:infos-coc')

  // ── CLAN DONJON ROUGE ─────────────────────────────────────────────────────
  console.log('\n📁 Clan Donjon Rouge')
  await apply(g('610767309488914443'), [
    ow(R.everyone,  [], [F.ViewChannel, F.SendMessages]),
    ow(R.nonVerifie,[], [F.ViewChannel]),
    ow(R.visiteur,  [], [F.ViewChannel]),
    // DR : lecture seule sur la catégorie (flood aura un override +SendMessages)
    ow(R.dr,        [F.ViewChannel], [F.SendMessages, F.AddReactions]),
    ow(R.lie,       [F.ViewChannel, F.SendMessages, F.AddReactions]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages, F.AddReactions]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads, F.AddReactions]),
  ], 'cat:clan-dr')

  // flood : Visiteur + DR (interprétation : membres DR peuvent écrire dans le salon général)
  await apply(g('1503680775462064168'), [
    ow(R.visiteur, [F.ViewChannel, F.SendMessages]),
    ow(R.dr,       [F.ViewChannel, F.SendMessages]),
  ], 'flood')

  // anniversaires
  await apply(g('1520034360559013939'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.lie,       [F.ViewChannel, F.AddReactions], [F.SendMessages]),
    ow(R.recruteur, [F.ViewChannel, F.AddReactions], [F.SendMessages]),
  ], 'anniversaires')

  // sondages
  await apply(g('1520034566532759633'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.lie,       [F.ViewChannel, F.AddReactions], [F.SendMessages]),
    ow(R.recruteur, [F.ViewChannel, F.AddReactions], [F.SendMessages]),
  ], 'sondages')

  // ── FORUM ─────────────────────────────────────────────────────────────────
  console.log('\n📁 Forum')
  await apply(g('1335372304288579654'), [
    ow(R.everyone,  [], [F.ViewChannel, F.SendMessages, F.Connect]),
    ow(R.nonVerifie,[], [F.ViewChannel]),
    ow(R.dr,        [F.ViewChannel], [F.SendMessages]),
    ow(R.lie,       [F.ViewChannel, F.SendMessages, F.AddReactions, F.Connect, F.Speak, F.UseVAD, F.Stream]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages, F.AddReactions, F.Connect, F.Speak, F.UseVAD, F.Stream]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads, F.AddReactions,
                     F.Connect, F.Speak, F.UseVAD, F.Stream, F.MuteMembers, F.DeafenMembers, F.MoveMembers]),
  ], 'cat:forum')

  // Salon type FORUM (15) : SendMessages seul ne suffit pas.
  // CreatePublicThreads = créer un post, SendMessagesInThreads = répondre dans un fil.
  await apply(g('1279055712089149440'), [
    ow(R.everyone,  [], [F.ViewChannel, F.SendMessages]),
    ow(R.dr,        [F.ViewChannel, F.ReadMessageHistory], [F.SendMessages, F.CreatePublicThreads, F.SendMessagesInThreads]),
    ow(R.lie,       [F.ViewChannel, F.SendMessages, F.CreatePublicThreads, F.SendMessagesInThreads,
                     F.ReadMessageHistory, F.EmbedLinks, F.AttachFiles, F.AddReactions,
                     F.UseExternalEmojis, F.UseExternalStickers]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages, F.CreatePublicThreads, F.SendMessagesInThreads,
                     F.ReadMessageHistory, F.EmbedLinks, F.AttachFiles, F.AddReactions,
                     F.UseExternalEmojis, F.UseExternalStickers]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.CreatePublicThreads, F.SendMessagesInThreads,
                     F.ReadMessageHistory, F.EmbedLinks, F.AttachFiles, F.AddReactions,
                     F.UseExternalEmojis, F.UseExternalStickers, F.ManageMessages, F.ManageThreads, F.MentionEveryone]),
  ], 'forum-du-clan')

  // ── GUERRE ────────────────────────────────────────────────────────────────
  console.log('\n📁 Guerre')
  await apply(g('768548839203274772'), [
    ow(R.everyone,  [], [F.ViewChannel, F.SendMessages, F.Connect]),
    ow(R.nonVerifie,[], [F.ViewChannel]),
    ow(R.lie,       [F.ViewChannel], [F.SendMessages]),
    ow(R.recruteur, [F.ViewChannel], [F.SendMessages]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads, F.AddReactions]),
  ], 'cat:guerre')

  await apply(g('1481240766712905839'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.lie,       [F.ViewChannel, F.SendMessages]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads]),
  ], 'flood-war')

  // ── VOCAUX ────────────────────────────────────────────────────────────────
  console.log('\n📁 Vocaux')
  await apply(g('1512087080594051102'), [
    ow(R.everyone,  [], [F.ViewChannel, F.Connect]),
    ow(R.lie,       [F.ViewChannel, F.Connect, F.Speak, F.Stream, F.UseVAD]),
    ow(R.recruteur, [F.ViewChannel, F.Connect, F.Speak, F.Stream, F.UseVAD]),
    ow(R.adjoint,   [F.ViewChannel, F.Connect, F.Speak, F.Stream, F.UseVAD,
                     F.MuteMembers, F.DeafenMembers, F.MoveMembers]),
  ], 'cat:vocaux')

  // ── QUARTIER DES GÉNÉRAUX ─────────────────────────────────────────────────
  console.log('\n📁 Quartier des Généraux')
  await apply(g('678344448781975554'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads, F.AddReactions]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages]),
  ], 'cat:quartier-gen')

  await apply(g('1512570321683746926'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages]),
  ], 'salle-du-trône')

  await apply(g('1512219335857279017'), [
    ow(R.everyone,  [], [F.ViewChannel]),
    ow(R.adjoint,   [F.ViewChannel, F.SendMessages, F.ManageMessages, F.ManageThreads]),
    ow(R.recruteur, [F.ViewChannel, F.SendMessages]),
  ], 'recrutement')

  // ── BOT ───────────────────────────────────────────────────────────────────
  console.log('\n📁 BOT')
  await apply(g('1510926918541639730'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [F.ViewChannel, F.SendMessages]),
  ], 'cat:bot')

  await apply(g('1510927063891316827'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [F.ViewChannel, F.SendMessages]),
  ], 'commande-bot')

  await apply(g('1511803261504454696'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [F.ViewChannel, F.SendMessages]),
  ], 'amélioration')

  // sauron : Chef Adjoint peut y accéder malgré la catégorie BOT fermée
  await apply(g('1512087471373029508'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [F.ViewChannel, F.SendMessages]),
    ow(R.adjoint,  [F.ViewChannel, F.SendMessages]),
  ], 'sauron')

  // cyberalf : Chef uniquement
  await apply(g('1522353459364626625'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [], [F.ViewChannel]),
  ], 'cyberalf')

  // log-bot : Chef uniquement
  await apply(g('1522722935918559364'), [
    ow(R.everyone, [], [F.ViewChannel]),
    ow(R.chef,     [F.ViewChannel, F.SendMessages]),
    ow(R.codeur,   [], [F.ViewChannel]),
  ], 'log-bot')

  console.log('\n✅ Permissions appliquées avec succès.')
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
