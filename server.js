

const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
let globalQueue = [];

const serverId = process.env.SERVER_ID; //891206595512500254 "724442652472246333"
const voiceChannelId = process.env.VOICE_CHANNEL_ID; //"724442652900196352"
const sessionToken = process.env.DISCORD_TOKEN;

const urlCommand = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Looks for a song')
	.addStringOption(option => option.setName('url').setDescription('Enter a url'))

const queueCommand = new SlashCommandBuilder()
	.setName('queue')
	.setDescription('Queues a song')
	.addStringOption(option => option.setName('url').setDescription('Enter a url'))

const playQueueCommand = new SlashCommandBuilder()
	.setName('play-q')
	.setDescription('Plays the queue')

const playlistCommand = new SlashCommandBuilder()
	.setName('playlist')
	.setDescription('Looks for a playlist')
	.addStringOption(option => option.setName('url').setDescription('Enter a url'))

const commands = [urlCommand, queueCommand, playQueueCommand, playlistCommand]; 

const rest = new REST({ version: '9' }).setToken('ODkxMjA2NTk1NTEyNTAwMjU0.YU6-0g.cnV4_oyFZCdR4sWD_DTQ94uic2s');

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands("891206595512500254", serverId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


async function createConnection(interaction) {
  const channel =  await interaction.client.channels.fetch(voiceChannelId);
  return joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
  });
}


client.on('interactionCreate', async interaction => {
    //interaction.deferReply();
    if (!interaction.isCommand()) return;
  
    // COMANDO PARA REPRODUCIR MÚSICA
    if (interaction.commandName === 'play') {
        const url = interaction.options.getString("url");
        // UNIMOS AL BOT AL CANAL DE VOZ Y CREAMOS UNA CONEXION
        const connection = await createConnection(interaction);

        const player = createAudioPlayer();
        connection.subscribe(player);
        
        // REPRODUCIMOS EL AUDIO DE LA URL DESDE YOUTUBE O UNA CANCIÓN POR DEFECTO
        const source = url? ytdl(url, {format: 'mp3'}) : "./audio.mp3";
        player.play(createAudioResource(source));

        player.on(AudioPlayerStatus.Idle, ()=> {
          player.stop();
          connection.destroy();
        })
        
        // EN CASO DE UN ERROR
        player.on("error", err=>{
          console.log(err);
        });

        interaction.reply(`Played ${url || "some music"}`)
    }

    if (interaction.commandName === 'queue') {
      const url = interaction.options.getString("url");
      globalQueue.push(url);
    }
    if (interaction.commandName === 'play-q') {
      if (globalQueue.length === 0) {
        interaction.reply("Debe haber al menos una canción en la cola");
        return;
      }
      interaction.reply("Aún trabajando en esta parte del código");
    }

    if (interaction.commandName === 'playlist') {
      const url = interaction.options.getString("url");
      const {title, items} = await ytpl(url);
      const urls = items.map(({url})=> url).reverse();

      let currentSong = urls.pop();

      const connection = await createConnection(interaction);
      const player = createAudioPlayer();
      connection.subscribe(player);

      player.play(createAudioResource(ytdl(currentSong, {format: 'mp3'})));
      //interaction.reply(`Reproduciendo: ${currentSong}`);

      player.on(AudioPlayerStatus.Idle, ()=> {
        player.stop();
        currentSong = urls.pop();
        player.play(createAudioResource(ytdl(currentSong, {format: 'mp3'})));
      })
      interaction.reply(`Lista: ${title}`);
    }

  });


client.login(sessionToken);

