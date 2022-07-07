import { v2 as cloudinary } from 'cloudinary';
import { Client, Intents, Message, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';
import isVideo from 'is-video';

import config from './config.js';
import commands from './help.js';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const app = express();
const port = 3000;

const bot = new Client({
    intents: [Intents.FLAGS.GUILDS],
    presence: {
        status: 'online',
        activities: [
            {
                name: 'Ready to upload.',
                type: 'LISTENING',
            },
        ],
    },
});

// Through bot interactions
bot.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'upload') {
        try {
            await interaction.deferReply();
            const attachment = interaction.options.getAttachment('attachment');
            const link = interaction.options.getString('link');

            const url = attachment?.url ?? link;
            const video = attachment ? attachment.contentType.includes('video') : isVideo(link);

            cloudinary.uploader.upload(
                url,
                {
                    folder: 'EN/',
                    resource_type: video ? 'video' : 'image',
                    ...(video
                        ? {
                              eager: [{ fetch_format: 'mp4', video_codec: 'h264', format: '' }],
                          }
                        : {}),
                },
                async (error, result) => {
                    if (error) {
                        await interaction.editReply(error.message);
                    } else {
                        const imgUrl = result.url;
                        await interaction.editReply(`Here's your URL: <${imgUrl}>`);
                    }
                }
            );
        } catch (error) {
            if (error.message.includes('acknowledged')) {
                await interaction.deleteReply();
            } else {
                await interaction.editReply(error.message);
            }
        }
    }
});

bot.login(process.env.TOKEN);

// OLD METHOD
const uploadImage = (url, fn) => {
    const isVideo = ['mp4', 'mov'].some(format => url.includes(format));
    cloudinary.uploader.upload(
        url,
        {
            folder: 'EN/',
            resource_type: isVideo ? 'video' : 'image',
            ...(isVideo
                ? {
                      eager: [{ fetch_format: 'mp4', video_codec: 'h264', format: '' }],
                  }
                : {}),
        },
        (error, result) => fn(error, result)
    );
};

const uploadTask = async (message: Message, args: string[]) => {
    const url = args.find(arg => arg.includes('https'));
    if (message.attachments.size > 0) {
        let image = message.attachments.first().url;
        uploadImage(image, (error, result) => {
            if (error) {
                message.reply(error.message);
            } else {
                const imgUrl = result.url;
                message.reply(`Here's your URL: <${imgUrl}>`);
            }
        });
    } else {
        if (!url) {
            return message.channel.send('You did not include an attachment URL.');
        }
        uploadImage(url, (error, result) => {
            if (error) {
                message.reply(error.message);
            } else {
                const imgUrl = result.url;
                message.reply(`Here's your URL: <${imgUrl}>`);
            }
        });
    }
};

bot.on('ready', () => console.log(`Logged in as ${bot.user.tag}.`));

// OLD: Through messages directly
bot.on('message', async message => {
    if (!message.content.startsWith(config.prefix)) return;

    let args = message.content.slice(config.prefix.length).split(' ');
    let command = args.shift().toLowerCase();

    switch (command) {
        case 'upload':
            await uploadTask(message, args);
            break;
        /* Unless you know what you're doing, don't change this command. */
        case 'help': {
            let embed = new MessageEmbed()
                .setTitle('HELP MENU')
                .setColor('GREEN')
                .setFooter(
                    `Requested by: ${
                        message.member ? message.member.displayName : message.author.username
                    }`,
                    message.author.displayAvatarURL()
                )
                .setThumbnail(bot.user.displayAvatarURL());
            if (!args[0]) {
                embed.setDescription(
                    Object.keys(commands)
                        .map(
                            command =>
                                `\`${command.padEnd(
                                    Object.keys(commands).reduce(
                                        (a, b) => (b.length > a.length ? b : a),
                                        ''
                                    ).length
                                )}\` :: ${commands[command].description}`
                        )
                        .join('\n')
                );
                0;
            } else {
                if (
                    Object.keys(commands).includes(args[0].toLowerCase()) ||
                    Object.keys(commands)
                        .map(c => commands[c].aliases || [])
                        .flat()
                        .includes(args[0].toLowerCase())
                ) {
                    let command = Object.keys(commands).includes(args[0].toLowerCase())
                        ? args[0].toLowerCase()
                        : Object.keys(commands).find(
                              c =>
                                  commands[c].aliases &&
                                  commands[c].aliases.includes(args[0].toLowerCase())
                          );
                    embed.setTitle(`COMMAND - ${command}`);

                    if (commands[command].aliases)
                        embed.addField(
                            'Command aliases',
                            `\`${commands[command].aliases.join('`, `')}\``
                        );
                    embed
                        .addField('DESCRIPTION', commands[command].description)
                        .addField(
                            'FORMAT',
                            `\`\`\`${config.prefix}${commands[command].format}\`\`\``
                        );
                } else {
                    embed
                        .setColor('RED')
                        .setDescription(
                            'This command does not exist. Please use the help command without specifying any commands to list them all.'
                        );
                }
            }
            message.channel.send(embed as any);
            break;
        }
    }
});

app.get('/', (req, res) => {
    res.send('Server is up.');
});
app.listen(port, () => {});
