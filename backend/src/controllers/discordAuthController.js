import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

const GUILD_ID = '610767309031866371'
const CHEF_ROLE_ID = '611123759864348672'
const CYBERALF_ID = '610765755553939456'

export async function discordOAuth(req, res) {
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Code manquant' })

  try {
    // 1. Échange le code contre un access token Discord
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Discord token exchange error:', err)
      return res.status(401).json({ error: 'Code Discord invalide ou expiré' })
    }

    const { access_token } = await tokenRes.json()

    // 2. Récupère le profil utilisateur
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Impossible de récupérer le profil Discord' })
    }
    const discordUser = await userRes.json()

    // 3. Vérifie membership et rôle Chef via le bot token
    const memberRes = await fetch(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${discordUser.id}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    )

    if (memberRes.status === 404) {
      return res.status(403).json({ error: "Tu n'es pas membre du serveur Donjon Rouge" })
    }
    if (!memberRes.ok) {
      console.error('Discord member fetch error:', memberRes.status)
      return res.status(500).json({ error: 'Erreur lors de la vérification du serveur' })
    }

    const member = await memberRes.json()
    const isChef = member.roles?.includes(CHEF_ROLE_ID)
    const isCyberAlf = discordUser.id === CYBERALF_ID

    if (!isChef && !isCyberAlf) {
      return res.status(403).json({ error: 'Accès réservé aux Chefs du clan' })
    }

    // 4. Crée le JWT dashboard (24h)
    const token = jwt.sign(
      {
        discord_id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name ?? null,
        avatar: discordUser.avatar ?? null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    return res.json({
      token,
      user: {
        id: discordUser.id,
        username: discordUser.username,
        global_name: discordUser.global_name ?? null,
        avatar: discordUser.avatar ?? null,
      },
    })
  } catch (err) {
    console.error('discordOAuth error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

export async function discordMe(req, res) {
  return res.json(req.discordUser)
}
