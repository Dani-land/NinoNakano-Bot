import sharp from 'sharp';

export default {
  command: ['toimg', 'toimage', 'toimg2'],
  category: 'utils',
  run: async ({ client, m }) => {
    const target = m.quoted || m;

    const mimetype =
      target.mimetype ||
      target.mediaType ||
      target.msg?.mimetype ||
      target.message?.stickerMessage?.mimetype ||
      '';

    const isSticker =
      mimetype.includes('webp') ||
      target.mediaType === 'sticker' ||
      target.mtype === 'stickerMessage' ||
      !!target.message?.stickerMessage ||
      (!!target.msg && target.mimetype?.includes?.('webp'));

    if (!isSticker && !mimetype.includes('webp')) {
      return m.reply('✎ Responde a un *sticker* para convertirlo en imagen.');
    }

    try {
      const buffer = await target.download();

      if (!buffer || !Buffer.isBuffer(buffer)) {
        return m.reply('✎ No pude descargar el sticker. Intenta de nuevo.');
      }

      const isAnimated =
        target.isAnimated === true ||
        target.msg?.isAnimated === true ||
        target.message?.stickerMessage?.isAnimated === true;

      if (isAnimated) {
        return m.reply('✎ Ese sticker es *animado*, no puedo convertirlo a imagen estática.');
      }

      const imagenBuffer = await sharp(buffer).png().toBuffer();

      await client.sendMessage(
        m.chat,
        {
          image: imagenBuffer,
          caption: '✎ Aquí tienes tu imagen.',
        },
        { quoted: m }
      );
    } catch (e) {
      console.error('[toimg]', e);
      return m.reply(`Error: ${e.message}. Reportar al creador del Bot.`);
    }
  },
};