import Papa from 'papaparse';
import axios from 'axios';

import eventsData from './events.json';
import { loadEstimatedTime, loadTask } from './store';
import { getCreatedTimestamp, getFavoriteWords } from './helpers';
import { DecodeUTF8 } from 'fflate';
import { snakeCase } from 'snake-case';

/**
 * Fetch a user on Discord.
 * This is necessary because sometimes we only have the user ID in the files.
 * @param userID The ID of the user to fetch
 */
const fetchUser = async (userID) => {
    const res = await axios(`https://diswho.androz2091.fr/user/${userID}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('diswhoJwt')}`
        }
    }).catch(() => { });
    if (!res || !res.data) return {
        username: 'Unknown',
        discriminator: '0000',
        avatar: null
    };
    return res.data;
};

/**
 * Parse the mention to return a user ID
 */
const parseMention = (mention) => {
    const mentionRegex = /^<@!?(\d+)>$/;
    return mentionRegex.test(mention) ? mention.match(mentionRegex)[1] : null;
};

/**
 * Parse a messages CSV into an object
 * @param input
 */
const parseCSV = (input) => {
    return Papa.parse(input, {
        header: true,
        newline: ',\r'
    })
        .data
        .filter((m) => m.Contents)
        .map((m) => ({
            id: m.ID,
            timestamp: m.Timestamp,
            length: m.Contents.length,
            words: m.Contents.split(' ')
            // content: m.Contents,
            // attachments: m.Attachments
        }));
};

const perDay = (value, userID) => {
    return parseInt(value / ((Date.now() - getCreatedTimestamp(userID)) / 24 / 60 / 60 / 1000));
};

// const readAnalyticsFile = (file) => {
//     return new Promise((resolve) => {
//         if (!file) resolve({});
//         const eventsOccurrences = {};
//         for (let eventName of eventsData.eventsEnabled) eventsOccurrences[eventName] = 0;
//         const decoder = new DecodeUTF8();
//         let startAt = Date.now();
//         let bytesRead = 0;
//         file.ondata = (_err, data, final) => {
//             bytesRead += data.length;
//             loadTask.set(`Loading user statistics... ${Math.ceil(bytesRead / file.originalSize * 100)}%`);
//             const remainingBytes = file.originalSize-bytesRead;
//             const timeToReadByte = (Date.now()-startAt) / bytesRead;
//             const remainingTime = parseInt(remainingBytes * timeToReadByte / 1000);
//             loadEstimatedTime.set(`Estimated time: ${remainingTime+1} second${remainingTime+1 === 1 ? '' : 's'}`);
//             decoder.push(data, final);
//         };
//         let prevChkEnd = '';
//         decoder.ondata = (str, final) => {
//             str = prevChkEnd + str;
//             for (let event of Object.keys(eventsOccurrences)) {
//                 const eventName = snakeCase(event);
//                 // eslint-disable-next-line no-constant-condition
//                 while (true) {
//                     const ind = str.indexOf(eventName);
//                     if (ind == -1) break;
//                     str = str.slice(ind + eventName.length);
//                     eventsOccurrences[event]++;
//                 }
//                 prevChkEnd = str.slice(-eventName.length);
//             }
//             if (final) {
//                 resolve({
//                     openCount: eventsOccurrences.appOpened,
//                     notificationCount: eventsOccurrences.notificationClicked,
//                     joinVoiceChannelCount: eventsOccurrences.joinVoiceChannel,
//                     joinCallCount: eventsOccurrences.joinCall,
//                     addReactionCount: eventsOccurrences.addReaction,
//                     messageEditedCount: eventsOccurrences.messageEdited,
//                     sendMessageCount: eventsOccurrences.sendMessage,
//                     slashCommandUsedCount: eventsOccurrences.slashCommandUsed
//                 });
//             }
//         };
//         file.start();
//     });
// };

const readAnalyticsFile = (file) => {
    const guildsVoctime = {},
        dmsVoctime = {},
        eventsOccurrences = {};
    for (let eventName of eventsData.eventsEnabled) eventsOccurrences[eventName] = 0;
    return new Promise((resolve) => {
        if (!file) resolve({});
        const decoder = new DecodeUTF8();
        let startAt = Date.now();
        let bytesRead = 0;
        file.ondata = (_err, data, final) => {
            bytesRead += data.length;
            loadTask.set(`Loading user statistics... ${Math.ceil((bytesRead / file.originalSize) * 100)}%`);
            const remainingBytes = file.originalSize - bytesRead;
            const timeToReadByte = (Date.now() - startAt) / bytesRead;
            const remainingTime = parseInt((remainingBytes * timeToReadByte) / 1000);
            loadEstimatedTime.set(`Estimated time: ${remainingTime + 1} second${remainingTime + 1 === 1 ? "" : "s"}`);
            decoder.push(data, final);
        };
        let prevChkEnd = "";
        decoder.ondata = async (str, final) => {
            //loop through buffer str, get every completed lines and iterate over them
            str = prevChkEnd + str;
            let pos;
            if ((pos = str.indexOf("\n")) >= 0) {
                let lines = str.split("\n");
                //last 'line' can be a part of a line and not an entire line so save it for next iteration
                let lastLine = lines.pop();
                for await(const line of lines) {
                    try {
                        let obj = JSON.parse(line.trim());
                        if (obj.event_type == "voice_disconnect" && obj.channel_id) {
                            if (obj.guild_id) {

                                guildsVoctime[obj.guild_id]
                                    ? (guildsVoctime[obj.guild_id] += obj.duration ? parseFloat(obj.duration) : 0)
                                    : (guildsVoctime[obj.guild_id] = obj.duration ? parseFloat(obj.duration) : 0);
                            } else {
                                dmsVoctime[obj.channel_id]
                                    ? (dmsVoctime[obj.channel_id] += obj.duration ? parseFloat(obj.duration) : 0)
                                    : (dmsVoctime[obj.channel_id] = obj.duration ? parseFloat(obj.duration) : 0);
                            }
                        }
                    } catch (err) {
                        console.error(line);
                    }

                    for await(let event of Object.keys(eventsOccurrences)) {
                        if (line.includes(snakeCase(event))) eventsOccurrences[event]++;
                    }

                }
                prevChkEnd = lastLine;

            }
            if (final) {
                console.log("Analytics file read");
                console.log("[debug] getting guilds informations");

                resolve({
                    globalVoctime: Object.values(guildsVoctime).reduce((accumulator, value) => accumulator + value),
                    guildsVoctime: Object.fromEntries(
                        Object.entries(guildsVoctime)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                    ),
                    dmsVoctime: Object.fromEntries(
                        Object.entries(dmsVoctime)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                    ),

                    openCount: eventsOccurrences.appOpened,
                    notificationCount: eventsOccurrences.notificationClicked,
                    joinVoiceChannelCount: eventsOccurrences.joinVoiceChannel,
                    joinCallCount: eventsOccurrences.joinCall,
                    addReactionCount: eventsOccurrences.addReaction,
                    messageEditedCount: eventsOccurrences.messageEdited,
                    sendMessageCount: eventsOccurrences.sendMessage,
                    slashCommandUsedCount: eventsOccurrences.slashCommandUsed,
                });
            }
        };
        file.start();
    });
};

//#region t
// while ((pos = str.indexOf("\n")) >= 0) {

//     // keep going while there's a newline somewhere in the buffer
//     if (pos == 0) {
//         // if str startswith \n, remote it
//         str = str.slice(2); // discard it
//         continue; // so that the next iteration will start with data
//     }
//     let e = str.indexOf("\n");
//     line = str.slice(0, pos);

//     // Do Whatever You Want With Your JSON Line Below That Line
//     try {
//         //process line for voctime
//         var obj = JSON.parse(line); // parse the JSON
//         if (obj.event_type == "voice_disconnect" && obj.channel_id) {
//             if (obj.guild_id) {

//                 guildsVoctime[obj.guild_id]
//                     ? (guildsVoctime[obj.guild_id] += obj.duration ? parseFloat(obj.duration) : 0)
//                     : (guildsVoctime[obj.guild_id] = obj.duration ? parseFloat(obj.duration) : 0);
//             } else {
//                 dmsVoctime[obj.channel_id]
//                     ? (dmsVoctime[obj.channel_id] += obj.duration ? parseFloat(obj.duration) : 0)
//                     : (dmsVoctime[obj.channel_id] = obj.duration ? parseFloat(obj.duration) : 0);
//             }
//         }
//     } catch (err) { console.error(e) }

//     //process line for others stats
//     for (let event of Object.keys(eventsOccurrences)) {
//         if (line.includes(snakeCase(event))) eventsOccurrences[event]++;
//     }

//     str = str.slice(pos + 1); // and slice the processed data off the buffer
// }

// if (final) {
//     console.log("Analytics file read");
//     console.log("[debug] getting guilds informations");

//     resolve({
//         globalVoctime: Object.values(guildsVoctime).reduce((accumulator, value) => accumulator + value),
//         guildsVoctime: Object.fromEntries(
//             Object.entries(guildsVoctime)
//                 .sort(([, a], [, b]) => b - a)
//                 .slice(0, 10)
//         ),
//         dmsVoctime: Object.fromEntries(
//             Object.entries(dmsVoctime)
//                 .sort(([, a], [, b]) => b - a)
//                 .slice(0, 10)
//         ),

//         openCount: eventsOccurrences.appOpened,
//         notificationCount: eventsOccurrences.notificationClicked,
//         joinVoiceChannelCount: eventsOccurrences.joinVoiceChannel,
//         joinCallCount: eventsOccurrences.joinCall,
//         addReactionCount: eventsOccurrences.addReaction,
//         messageEditedCount: eventsOccurrences.messageEdited,
//         sendMessageCount: eventsOccurrences.sendMessage,
//         slashCommandUsedCount: eventsOccurrences.slashCommandUsed,
//     });
// }
//#endregion

/**
 * Extract the data from the package file.
 * @param files The files in the package
 * @returns The extracted data
 */
export const extractData = async (files) => {

    const extractedData = {
        user: null,

        topDMs: [],
        topChannels: [],
        guildCount: 0,
        dmChannelCount: 0,
        channelCount: 0,
        messageCount: 0,
        characterCount: 0,
        totalSpent: 0,
        hoursValues: [],
        favoriteWords: null,
        payments: {
            total: 0,
            list: ''
        },
        gamesPlayed: [],
        guildsVoctime: {},
        dmsVoctime: {},
        globalVoctime: 0,
    };

    const getFile = (name) => files.find((file) => file.name === name);
    // Read a file from its name
    const readFile = (name) => {
        return new Promise((resolve) => {
            const file = getFile(name);
            if (!file) return resolve(null);
            const fileContent = [];
            const decoder = new DecodeUTF8();
            file.ondata = (err, data, final) => {
                decoder.push(data, final);
            };
            decoder.ondata = (str, final) => {
                fileContent.push(str);
                if (final) resolve(fileContent.join(''));
            };
            file.start();
        });
    };

    // Parse and load current user informations
    console.log('[debug] Loading user info...');
    loadTask.set('Loading user information...');

    extractedData.user = JSON.parse(await readFile('account/user.json'));
    loadTask.set('Fetching user information...');
    const fetchedUser = await fetchUser(extractedData.user.id);
    extractedData.user.username = fetchedUser.username;
    extractedData.user.discriminator = fetchedUser.discriminator;
    extractedData.user.avatar_hash = fetchedUser.avatar;

    const confirmedPayments = extractedData.user.payments.filter((p) => p.status === 1);
    if (confirmedPayments.length) {
        extractedData.payments.total += confirmedPayments.map((p) => p.amount / 100).reduce((p, c) => p + c);
        extractedData.payments.list += confirmedPayments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((p) => `${p.description} ($${p.amount / 100})`).join('<br>');
    }
    console.log('[debug] User info loaded.');

    // Parse and load channels
    console.log('[debug] Loading channels...');
    loadTask.set('Loading user messages...');

    const messagesIndex = JSON.parse(await readFile('messages/index.json'));

    const messagesPathRegex = /messages\/c?([0-9]{16,32})\/$/;
    const channelsIDsFile = files.filter((file) => messagesPathRegex.test(file.name));

    // Packages before 06-12-2021 does not have the leading "c" before the channel ID
    const isOldPackage = channelsIDsFile[0].name.match(/messages\/(c)?([0-9]{16,32})\/$/)[1] === undefined;
    const channelsIDs = channelsIDsFile.map((file) => file.name.match(messagesPathRegex)[1]);

    console.log(`[debug] Old package: ${isOldPackage}`);

    const channels = [];
    let messagesRead = 0;

    await Promise.all(channelsIDs.map((channelID) => {
        return new Promise((resolve) => {

            const channelDataPath = `messages/${isOldPackage ? '' : 'c'}${channelID}/channel.json`;
            const channelMessagesPath = `messages/${isOldPackage ? '' : 'c'}${channelID}/messages.csv`;

            Promise.all([
                readFile(channelDataPath),
                readFile(channelMessagesPath)
            ]).then(([rawData, rawMessages]) => {

                if (!rawData || !rawMessages) {
                    console.log(`[debug] Files of channel ${channelID} can't be read. Data is ${!!rawData} and messages are ${!!rawMessages}. (path=${channelDataPath})`);
                    return resolve();
                } else messagesRead++;

                const data = JSON.parse(rawData);
                const messages = parseCSV(rawMessages);
                const name = messagesIndex[data.id];
                const isDM = data.recipients && data.recipients.length === 2;
                const dmUserID = isDM ? data.recipients.find((userID) => userID !== extractedData.user.id) : undefined;
                channels.push({
                    data,
                    messages,
                    name,
                    isDM,
                    dmUserID
                });

                resolve();
            });

        });
    }));

    if (messagesRead === 0) throw new Error('invalid_package_missing_messages');

    loadTask.set('Calculating statistics...');

    extractedData.channelCount = channels.filter(c => !c.isDM).length;
    extractedData.dmChannelCount = channels.length - extractedData.channelCount;
    extractedData.topChannels = channels.filter(c => c.data && c.data.guild).sort((a, b) => b.messages.length - a.messages.length).slice(0, 10).map((channel) => ({
        name: channel.name,
        messageCount: channel.messages.length,
        guildName: channel.data.guild.name
    }));
    extractedData.characterCount = channels.map((channel) => channel.messages).flat().map((message) => message.length).reduce((p, c) => p + c);

    for (let i = 0; i < 24; i++) {
        extractedData.hoursValues.push(channels.map((c) => c.messages).flat().filter((m) => new Date(m.timestamp).getHours() === i).length);
    }

    console.log(`[debug] ${channels.length} channels loaded.`);

    console.log('[debug] Loading guilds...');
    loadTask.set('Loading joined servers...');

    const guildIndex = JSON.parse(await readFile('servers/index.json'));
    extractedData.guildCount = Object.keys(guildIndex).length;

    console.log(`[debug] ${extractedData.guildCount} guilds loaded`);

    const words = channels.map((channel) => channel.messages).flat().map((message) => message.words).flat().filter((w) => w.length > 5);
    extractedData.favoriteWords = getFavoriteWords(words);
    for (let wordData of extractedData.favoriteWords) {
        const userID = parseMention(wordData.word);
        if (userID) {
            const userData = await fetchUser(userID);
            extractedData.favoriteWords[extractedData.favoriteWords.findIndex((wd) => wd.word === wordData.word)] = {
                word: `@${userData.username}`,
                count: wordData.count
            };
        }
    }

    console.log('[debug] Fetching top DMs...');
    loadTask.set('Loading user activity...');

    extractedData.topDMs = channels
        .filter((channel) => channel.isDM)
        .sort((a, b) => b.messages.length - a.messages.length)
        .slice(0, 10)
        .map((channel) => ({
            id: channel.data.id,
            dmUserID: channel.dmUserID,
            messageCount: channel.messages.length,
            userData: null
        }));
    await Promise.all(extractedData.topDMs.map((channel) => {
        return new Promise((resolve) => {
            fetchUser(channel.dmUserID).then((userData) => {
                const channelIndex = extractedData.topDMs.findIndex((c) => c.id === channel.id);
                extractedData.topDMs[channelIndex].userData = userData;
                resolve();
            });
        });
    }));

    console.log(`[debug] ${extractedData.topDMs.length} top DMs loaded.`);

    loadTask.set('Calculating statistics...');
    console.log('[debug] Fetching activity...');

    const statistics = await readAnalyticsFile(files.find((file) => /activity\/analytics\/events-[0-9]{4}-[0-9]{5}-of-[0-9]{5}\.json/.test(file.name)));
    extractedData.openCount = statistics.openCount;
    extractedData.averageOpenCountPerDay = extractedData.openCount && perDay(statistics.openCount, extractedData.user.id);
    extractedData.notificationCount = statistics.notificationCount;
    extractedData.joinVoiceChannelCount = statistics.joinVoiceChannelCount;
    extractedData.joinCallCount = statistics.joinCallCount;
    extractedData.addReactionCount = statistics.addReactionCount;
    extractedData.messageEditedCount = statistics.messageEditedCount;
    extractedData.sentMessageCount = statistics.sendMessageCount;
    extractedData.averageMessageCountPerDay = extractedData.sentMessageCount && perDay(extractedData.sentMessageCount, extractedData.user.id);
    extractedData.slashCommandUsedCount = statistics.slashCommandUsedCount;

    for (const [guildId, voctime] of Object.entries(statistics.guildsVoctime)) {
        statistics.guildsVoctime[guildId] = {
            name: guildIndex[guildId],
            voctime: voctime,
        };
    }
    extractedData.globalVoctime = statistics.globalVoctime;
    extractedData.guildsVoctime = statistics.guildsVoctime;

    for (const [channelId, voctime] of Object.entries(statistics.dmsVoctime)) {
        statistics.dmsVoctime[channelId] = {
            name: messagesIndex[channelId],
            voctime: voctime,
        };
    }
    extractedData.dmsVoctime = statistics.dmsVoctime;
    console.log('[debug] Activity fetched...');

    console.log("[debug] Fetching games...");
    const { data: detectables } = await axios({
        method: "GET",
        url: "https://discord.com/api/v9/applications/detectable",
    });
    for (const userGame of extractedData.user.user_activity_application_statistics
        .sort((a, b) => (a.total_duration < b.total_duration ? 1 : -1))
        .splice(0, 10)) {
        let discordSideGameInfo = detectables.find((game) => userGame.application_id == game.id);
        extractedData.gamesPlayed.push({
            name: discordSideGameInfo && discordSideGameInfo.name ? discordSideGameInfo.name : "Unknow Game",
            timePlayed: Math.round(userGame.total_duration / 3600),
            icon:
                discordSideGameInfo && discordSideGameInfo.icon
                    ? `https://cdn.discordapp.com/app-icons/${discordSideGameInfo.id}/${discordSideGameInfo.icon}.webp`
                    : "",
        });
    }
    console.log("[debug] Games fetched...");

    loadTask.set('Calculating statistics...');

    console.log(extractedData);

    return extractedData;
};
