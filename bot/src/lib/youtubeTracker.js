const { ChannelType } = require('discord.js')
const supabase = require('../supabase.js')

const CHEF_ID = '611123759864348672'

// ─── Résolution du channel_id depuis un lien YouTube ─────────────────────────

async function resolveChannelId(url) {
  const directMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/)
  if (directMatch) return directMatch[1]

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return null
    const html = await res.text()

    const metaMatch = html.match(/<meta\s+itemprop="channelId"\s+content="(UC[\w-]+)"/)
    if (metaMatch) return metaMatch[1]

    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="[^"]*\/channel\/(UC[\w-]+)"/)
    if (canonicalMatch) return canonicalMatch[1]

    const fallbackMatch = html.match(/"channelId":"(UC[\w-]+)"/)
    if (fallbackMatch) return fallbackMatch[1]

    return null
  } catch {
    return null
  }
}

// ─── Lecture du flux RSS ──────────────────────────────────────────────────────

async function fetchLatestVideo(channelId) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  try {
    const res = await fetch(rssUrl)
    if (!res.ok) return null
    const xml = await res.text()

    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
    if (!entryMatch) return null
    const entry = entryMatch[1]

    const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)
    if (!videoIdMatch) return null

    const videoId = videoIdMatch[1].trim()
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
    const linkMatch = entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/)

    return {
      videoId,
      title: titleMatch?.[1]?.trim() ?? '',
      link:  linkMatch?.[1]?.trim() ?? `https://www.youtube.com/watch?v=${videoId}`,
    }
  } catch {
    return null
  }
}

async function fetchChannelName(channelId) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  try {
    const res = await fetch(rssUrl)
    if (!res.ok) return channelId
    const xml = await res.text()
    const feedPart = xml.split('<entry>')[0]
    const titleMatch = feedPart.match(/<title>([\s\S]*?)<\/title>/)
    return titleMatch?.[1]?.trim() ?? channelId
  } catch {
    return channelId
  }
}

// ─── Gestion des chaînes en base ──────────────────────────────────────────────

async function ensureChannel(channelId, channelUrl) {
  const { data: existing } = await supabase
    .from('youtube_channels')
    .select('channel_id, channel_name')
    .eq('channel_id', channelId)
    .maybeSingle()

  if (existing) return existing

  const [channelName, latestVideo] = await Promise.all([
    fetchChannelName(channelId),
    fetchLatestVideo(channelId),
  ])

  const now = new Date().toISOString()
  await supabase.from('youtube_channels').insert({
    channel_id:      channelId,
    channel_name:    channelName,
    channel_url:     channelUrl,
    last_video_id:   latestVideo?.videoId ?? null,
    last_checked_at: now,
    created_at:      now,
  })

  return { channel_id: channelId, channel_name: channelName }
}

// ─── Salon Discord privé du membre ────────────────────────────────────────────

async function ensureMemberChannel(member, guild, client) {
  const safeName = member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const expectedName = `📺-suivi-${safeName}`

  // 1. Vérifier la table youtube_member_channels
  const { data: existing, error: queryError } = await supabase
    .from('youtube_member_channels')
    .select('discord_channel_id')
    .eq('discord_id', member.id)
    .maybeSingle()

  if (!queryError && existing?.discord_channel_id) {
    const ch = await client.channels.fetch(existing.discord_channel_id).catch(() => null)
    if (ch) return ch
    // Salon supprimé manuellement — on nettoie la ligne
    await supabase.from('youtube_member_channels').delete().eq('discord_id', member.id)
  }

  // 2. Fallback : chercher un salon existant par nom dans le guild (réconciliation)
  const allChannels = await guild.channels.fetch().catch(() => null)
  const channelList = allChannels ? [...allChannels.values()] : [...guild.channels.cache.values()]
  const existingDiscordChannel = channelList.find(c => c?.name === expectedName)

  if (existingDiscordChannel) {
    const { error: upsertErr } = await supabase.from('youtube_member_channels').upsert({
      discord_id:         member.id,
      discord_channel_id: existingDiscordChannel.id,
    })
    if (upsertErr) console.error('[YouTube] upsert member_channel (réconciliation):', upsertErr.message)
    return existingDiscordChannel
  }

  // 3. Rien trouvé — créer un nouveau salon
  const CATEGORY_NAME = '📺 SUIVIS YOUTUBE'
  let category = channelList.find(
    c => c?.type === ChannelType.GuildCategory && c.name === CATEGORY_NAME
  )
  if (!category) {
    category = await guild.channels.create({ name: CATEGORY_NAME, type: ChannelType.GuildCategory })
  }

  const salon = await guild.channels.create({
    name:   expectedName,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny:  ['ViewChannel'] },
      { id: member.id,            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: CHEF_ID,              allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: client.user.id,       allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] },
    ],
  })

  const { error: upsertErr } = await supabase.from('youtube_member_channels').upsert({
    discord_id:         member.id,
    discord_channel_id: salon.id,
  })
  if (upsertErr) console.error('[YouTube] upsert member_channel (création):', upsertErr.message)

  return salon
}

// ─── Boucle de vérification ───────────────────────────────────────────────────

async function checkYoutubeUpdates(client) {
  const { data: channels } = await supabase
    .from('youtube_channels')
    .select('channel_id, channel_name, last_video_id')

  if (!channels?.length) return

  for (const ch of channels) {
    try {
      const latest = await fetchLatestVideo(ch.channel_id)
      if (!latest) continue

      if (!ch.last_video_id) {
        await supabase.from('youtube_channels')
          .update({ last_video_id: latest.videoId, last_checked_at: new Date().toISOString() })
          .eq('channel_id', ch.channel_id)
        continue
      }

      if (latest.videoId === ch.last_video_id) continue

      await supabase.from('youtube_channels')
        .update({ last_video_id: latest.videoId, last_checked_at: new Date().toISOString() })
        .eq('channel_id', ch.channel_id)

      const [{ data: officials }, { data: memberFollows }] = await Promise.all([
        supabase.from('youtube_follows_official').select('channel_id').eq('channel_id', ch.channel_id),
        supabase.from('youtube_follows_member').select('discord_id').eq('channel_id', ch.channel_id),
      ])

      if (officials?.length) {
        const { data: cfg } = await supabase
          .from('bot_config')
          .select('value')
          .eq('key', 'youtube_official_channel_id')
          .maybeSingle()

        if (cfg?.value) {
          const discordCh = await client.channels.fetch(cfg.value).catch(() => null)
          if (discordCh) await discordCh.send(latest.link).catch(e => console.error('[YouTube] Official post:', e.message))
        }
      }

      if (memberFollows?.length) {
        for (const follow of memberFollows) {
          try {
            const { data: mc } = await supabase
              .from('youtube_member_channels')
              .select('discord_channel_id')
              .eq('discord_id', follow.discord_id)
              .maybeSingle()

            if (!mc) continue

            const discordCh = await client.channels.fetch(mc.discord_channel_id).catch(() => null)
            if (!discordCh) continue

            await discordCh.send(`🔴 **${ch.channel_name}** a posté une nouvelle vidéo !\n<@${follow.discord_id}> ${latest.link}`)
            await new Promise(r => setTimeout(r, 500))
          } catch (e) {
            console.error(`[YouTube] Member notify ${follow.discord_id}:`, e.message)
          }
        }
      }

      console.log(`[YouTube] Nouvelle vidéo détectée — ${ch.channel_name}: ${latest.link}`)
    } catch (e) {
      console.error(`[YouTube] Channel ${ch.channel_id}:`, e.message)
    }
  }
}

// ─── Point d'entrée du scheduler YouTube ─────────────────────────────────────

function startYoutubeScheduler(client) {
  const run = async () => {
    try { await checkYoutubeUpdates(client) }
    catch (e) { console.error('[YouTube] Erreur scheduler:', e.message) }
  }
  setTimeout(run, 30_000)
  setInterval(run, 15 * 60 * 1000)
  console.log('[YouTube] Scheduler démarré — vérification toutes les 15 minutes')
}

module.exports = { resolveChannelId, fetchLatestVideo, fetchChannelName, ensureChannel, ensureMemberChannel, checkYoutubeUpdates, startYoutubeScheduler }
