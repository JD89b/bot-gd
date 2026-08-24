const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Configuración adaptada para servidores Linux (Render / Nube)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('⚡ Escanea el código QR desde tu celular.');
});

client.on('ready', () => {
    console.log('✅ ¡Bot Beta de GD v1.0 conectado y listo!');
});

client.on('message_create', async (msg) => {
    const text = msg.body.trim();
    if (!text.startsWith('#')) return;

    const args = text.split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    // ==========================================
    // 1. COMANDOS DE NIVELES (GDBrowser API)
    // ==========================================

    if (command === '#lvl' || command === '#level') {
        if (!query) return msg.reply('❌ Debes ingresar el nombre o ID de un nivel.');
        try {
            const res = await axios.get(`https://gdbrowser.com/api/search/${encodeURIComponent(query)}`);
            const lvl = res.data[0];
            if (!lvl) return msg.reply('❌ No se encontró el nivel.');

            const isPlat = lvl.platformer ? '🌙' : '⭐';
            let reply = `*${lvl.name}* by ${lvl.author}\n`;
            reply += `🆔 ID: ${lvl.id}\n`;
            reply += `📊 Dificultad: ${lvl.difficulty} (${lvl.stars} ${isPlat})\n`;
            reply += `📥 Descargas: ${lvl.downloads.toLocaleString()} | 👍 Likes: ${lvl.likes.toLocaleString()}\n`;
            reply += `🎵 Canción: ${lvl.songName} - ${lvl.songAuthor}`;

            await msg.reply(reply);
        } catch (error) {
            msg.reply('❌ Error al consultar el nivel.');
        }
    }

    if (command === '#lvlimage') {
        if (!query) return msg.reply('❌ Debes ingresar la ID o nombre del nivel.');
        try {
            const res = await axios.get(`https://gdbrowser.com/api/search/${encodeURIComponent(query)}`);
            const lvl = res.data[0];
            if (!lvl) return msg.reply('❌ No se encontró el nivel en GD.');

            const thumbnailUrl = `https://levelthumbs.prevter.me/thumbnail/${lvl.id}.png`;

            const imgRes = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
            const base64Image = Buffer.from(imgRes.data, 'binary').toString('base64');
            
            const media = new MessageMedia('image/png', base64Image, `${lvl.id}.png`);

            await client.sendMessage(msg.from, media, {
                caption: `🖼️ Miniatura de *${lvl.name}* (ID: ${lvl.id}) por *${lvl.author}*`
            });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                msg.reply(`❌ El nivel no tiene una miniatura subida en Level Thumbnails aún.`);
            } else {
                console.error('Error en #lvlimage:', error.message);
                msg.reply('❌ Ocurrió un error al obtener la miniatura.');
            }
        }
    }

    if (['#daily', '#weekly', '#event'].includes(command)) {
        const type = command.replace('#', '');
        try {
            const res = await axios.get(`https://gdbrowser.com/api/level/${type}`);
            const lvl = res.data;

            let reply = `🌟 *${type.toUpperCase()} LEVEL* 🌟\n\n`;
            reply += `*${lvl.name}* by ${lvl.author}\n`;
            reply += `🆔 ID: ${lvl.id}\n`;
            reply += `📊 Dificultad: ${lvl.difficulty} (${lvl.stars} ⭐)\n`;
            reply += `🎵 Canción: ${lvl.songName}`;

            await msg.reply(reply);
        } catch (error) {
            msg.reply(`❌ No se pudo obtener el nivel ${type}.`);
        }
    }

    // ==========================================
    // 2. DEMONLIST (Pointercrate API)
    // ==========================================

    if (['#pointercrate', '#demonlist', '#dl'].includes(command)) {
        try {
            if (!query) {
                const res = await axios.get('https://pointercrate.com/api/v2/demons/?limit=10');
                let reply = `🔥 *POINTERCRATE TOP 10* 🔥\n\n`;
                res.data.forEach(d => { reply += `#${d.position} - *${d.name}*\n`; });
                await msg.reply(reply);
            } else {
                const res = await axios.get(`https://pointercrate.com/api/v2/demons/?name_contains=${encodeURIComponent(query)}`);
                const demon = res.data[0];
                if (!demon) return msg.reply('❌ Nivel no encontrado en la Demonlist.');

                const detail = (await axios.get(`https://pointercrate.com/api/v2/demons/${demon.id}`)).data.data;

                let listType = "Main List";
                if (detail.position > 75 && detail.position <= 150) listType = "Extended List";
                if (detail.position > 150) listType = "Legacy List";

                let reply = `🏆 *${detail.name}* (#${detail.position})\n`;
                reply += `📌 Categoría: ${listType}\n`;
                reply += `👤 Host/Publisher: ${detail.publisher.name}\n`;
                reply += `✅ Verificador: ${detail.verifier.name}`;

                await msg.reply(reply);
            }
        } catch (error) {
            msg.reply('❌ Error al consultar Pointercrate.');
        }
    }

    if (command === '#dlprofile') {
        if (!query) return msg.reply('❌ Ingresa el nombre del jugador en Pointercrate.');
        try {
            const res = await axios.get(`https://pointercrate.com/api/v2/players/?name_contains=${encodeURIComponent(query)}`);
            const player = res.data[0];
            if (!player) return msg.reply('❌ Jugador no encontrado en la Demonlist.');

            let reply = `👤 *Perfil de Demonlist: ${player.name}*\n`;
            reply += `🆔 ID: ${player.id}\n`;
            reply += `🌐 País: ${player.nationality ? player.nationality.nation : 'No especificado'}\n`;
            reply += `Baneado: ${player.banned ? 'Sí ❌' : 'No ✅'}`;

            await msg.reply(reply);
        } catch (error) {
            msg.reply('❌ No se pudo obtener el perfil de Pointercrate.');
        }
    }

    // ==========================================
    // 3. CHALLENGE LIST (Challengelist API)
    // ==========================================

    if (['#challengelist', '#cl'].includes(command)) {
        try {
            if (!query) {
                const res = await axios.get('https://challengelist.gd/api/v1/demons/');
                let reply = `⚔️ *CHALLENGE LIST TOP 10* ⚔️\n\n`;
                res.data.slice(0, 10).forEach(c => { reply += `#${c.position} - *${c.name}*\n`; });
                await msg.reply(reply);
            } else {
                const res = await axios.get('https://challengelist.gd/api/v1/demons/');
                const isNum = !isNaN(query);
                const challenge = isNum 
                    ? res.data.find(c => c.position === parseInt(query))
                    : res.data.find(c => c.name.toLowerCase().includes(query.toLowerCase()));

                if (!challenge) return msg.reply('❌ Challenge no encontrado.');

                let reply = `⚔️ *${challenge.name}* (#${challenge.position})\n`;
                reply += `👤 Creador: ${challenge.publisher.name}\n`;
                reply += `✅ Verificador: ${challenge.verifier.name}`;

                await msg.reply(reply);
            }
        } catch (error) {
            msg.reply('❌ Error al consultar la Challenge List.');
        }
    }

    if (command === '#clprofile') {
        if (!query) return msg.reply('❌ Ingresa el nombre del jugador de la Challenge List.');
        try {
            const res = await axios.get(`https://challengelist.gd/api/v1/players/?name_contains=${encodeURIComponent(query)}`);
            const player = res.data[0];
            if (!player) return msg.reply('❌ Jugador no encontrado en la Challenge List.');

            let reply = `👤 *Perfil Challenge List: ${player.name}*\n`;
            reply += `🏆 Posición en leaderboard: #${player.rank || 'Sin Rango'}`;

            await msg.reply(reply);
        } catch (error) {
            msg.reply('❌ No se pudo obtener el perfil de la Challenge List.');
        }
    }
});

client.initialize();
