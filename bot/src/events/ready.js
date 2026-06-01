module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Bot connecté : ${client.user.tag}`)
    client.user.setActivity('Donjon Rouge ⚔️', { type: 4 /* Custom */ })
  }
}
