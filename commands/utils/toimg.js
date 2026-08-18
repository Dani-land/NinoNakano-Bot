import sharp from 'sharp';

export default {
  command: ['toimg', 'toimage', 'toimg2'],
  category: 'sticker',
  run: async ({ client, m }) => {
    const quoted = m.quoted ? m.quoted : m;
    const mimetype = quoted.mimetype || quoted.mediaType || '';

    if (!mimetype.includes('webp')) {
      return m.reply('✎ Responde a un sticker para convertirlo en imagen.');
    }

    try {
      const buffer = await quoted.download();

      const isAnimated = quoted.isAnimated ?? false;
      if (isAnimated) {
        return m.reply('✎ Ese sticker es animado, no puedo convertirlo a imagen estática.');
      }

      const imagenBuffer = await sharp(buffer).png().toBuffer();

      await client.sendMessage(m.chat, {
        image: imagenBuffer,
        caption: '✎ Aquí tienes tu imagen.'
      }, { quoted: m });
    } catch (e) {
      console.error(e);
      return m.reply(`Error: ${e.message}. Reportar al creador del Bot.`);
    }
  },
};