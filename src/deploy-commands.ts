import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import dotenv from 'dotenv'

dotenv.config()

const commands = [
  new SlashCommandBuilder().setName('upload').setDescription('Uploads an image or video to cloudinary.').addAttachmentOption(option => option.setName('attachment').setDescription('Attach an image or video.')).addStringOption(option => option.setName('link').setDescription('Enter a link.'))
  ,
]
  .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

await rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands },
).catch(err => console.log(err));