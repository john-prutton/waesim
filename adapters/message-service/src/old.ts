import type { Boom } from "@hapi/boom"
import { DisconnectReason, makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys"

const connect = async () => {
  const auth = await useMultiFileAuthState("../../apps/backend/auth_info_baileys")

  console.log("making wa socket")
  const sock = makeWASocket({
    auth: auth.state,
  })

  sock.ev.on("creds.update", async (arg) => {
    console.log("creds.update")
    await auth.saveCreds()
  })

  sock.ev.on("connection.update", async (update) => {
    console.log("connection.update", update.connection)
    const { connection, lastDisconnect, qr } = update
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("connection closed", ", reconnecting:", shouldReconnect)
      if (shouldReconnect) {
        await sock.ws.close()
        connect()
      }
    } else if (connection === "open") {
      console.log("opened connection")
    }
  })

  sock.ev.on("messages.upsert", async (event) => {
    console.log("message.upsert")
    if (event.type !== "notify") return
    for (const m of event.messages) {
      if (m.key.fromMe) continue

      const _ = await sock.sendMessage(m.key.remoteJid!, {
        text: "hi",
        contextInfo: {
          stanzaId: m.key.id,
          participant: m.key.remoteJid,
          quotedMessage: { conversation: m.message!.conversation },
        },
      })
    }
  })

  await sock.waitForConnectionUpdate(async (u) => u.connection && u.connection === "open")
}

connect()
