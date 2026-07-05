require('dotenv').config()
const { fetchLatestVideo, fetchChannelName } = require('../lib/youtubeTracker.js')
const supabase = require('../supabase.js')

const channelId = process.argv[2]

if (!channelId) {
  console.error('Usage : node src/scripts/testYoutubeCheck.js <channel_id>')
  console.error('Exemple : node src/scripts/testYoutubeCheck.js UC0QsbIdsn75NES7JrNqQ7vw')
  process.exit(1)
}

;(async () => {
  console.log(`\n🔍 Test RSS pour : ${channelId}\n`)

  const [latest, channelName] = await Promise.all([
    fetchLatestVideo(channelId),
    fetchChannelName(channelId),
  ])

  if (!latest) {
    console.error('❌ Impossible de lire le flux RSS.')
    console.error('   Vérifie que le channel_id est correct (format UCxxxx) et que la chaîne a des vidéos publiques.')
    process.exit(1)
  }

  const { data: stored, error } = await supabase
    .from('youtube_channels')
    .select('last_video_id')
    .eq('channel_id', channelId)
    .maybeSingle()

  console.log(`Chaîne      : ${channelName}`)
  console.log(`Titre       : ${latest.title}`)
  console.log(`Lien        : ${latest.link}`)
  console.log(`Video ID    : ${latest.videoId}`)

  if (error) {
    console.log(`Base        : ⚠️  Erreur Supabase (${error.message}) — tables créées ?`)
  } else if (!stored) {
    console.log(`Base        : ⚪ Chaîne non enregistrée (aucun suivi actif)`)
  } else if (latest.videoId === stored.last_video_id) {
    console.log(`Base        : ✅ Déjà connue (last_video_id = ${stored.last_video_id})`)
  } else {
    console.log(`Base        : 🔴 Nouvelle vidéo ! (last_video_id en base = ${stored.last_video_id})`)
  }

  console.log('\n(Base non modifiée, aucune notification envoyée)')
})()
