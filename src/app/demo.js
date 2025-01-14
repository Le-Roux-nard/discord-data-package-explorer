const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const demoUserObject = {
    id: 422820341791064085,
    username: 'Wumpus',
    discriminator: '0000',
    avatar: null
};

export default () => {

    const removeAnalytics = window.location.href.includes('noanalytics');

    return {
        isDemo: true,

        user: demoUserObject,

        topDMs: new Array(10).fill({}).map(() => ({
            messageCount: randomNumber(200, 600),
            userData: demoUserObject
        })).sort((a, b) => b.messageCount - a.messageCount),
        topChannels: new Array(10).fill({}).map(() => ({
            messageCount: randomNumber(200, 600),
            name: 'awesome',
            guildName: 'AndrozDev'
        })).sort((a, b) => b.messageCount - a.messageCount),
        guildCount: randomNumber(10, 200),
        dmChannelCount: randomNumber(30, 50),
        channelCount: randomNumber(50, 100),
        messageCount: randomNumber(300, 600),
        characterCount: randomNumber(4000, 10000),
        totalSpent: randomNumber(100, 200),
        hoursValues: new Array(24).fill(0).map(() => Math.floor(Math.random() * 300) + 1),
        favoriteWords: [
            {
                word: 'Androz2091',
                count: randomNumber(600, 1000)
            },
            {
                word: 'DDPE',
                count: randomNumber(200, 600)
            }
        ],
        payments: {
            total: 0,
            list: ''
        },
        gamesPlayed: new Array(10)
            .fill({})
            .map(() => ({
                name: `Game n°`,
                timePlayed: randomNumber(1, 666),
                icon: null,
            }))
            .sort((a, b) => b.timePlayed - a.timePlayed)
            .map((value, i) => {
                value.name += i + 1;
                return value;
            }),
        globalVoctime: randomNumber(60000, Infinity),
        guildsVoctime: {
            idGuild1: { name: 'Server n°1', voctime: '31536000000' },
            idGuild2: { name: 'Server n°2', voctime: '16070400000' },
            idGuild3: { name: 'Server n°3', voctime: '2629743000' },
            idGuild4: { name: 'Server n°4', voctime: '1209600000' },
            idGuild5: { name: 'Server n°5', voctime: '604800000' },
            idGuild6: { name: 'Server n°6', voctime: '345600000' },
            idGuild7: { name: 'Server n°7', voctime: '172800000' },
            idGuild8: { name: 'Server n°8', voctime: '86400000' },
            idGuild9: { name: 'Server n°9', voctime: '43200000' },
            idGuild10: { name: 'Server n°10', voctime: '14400000' },
        }, dmsVoctime: {
            idGuild1: { name: 'User/Group n°1', voctime: '31536000000' },
            idGuild2: { name: 'User/Group n°2', voctime: '16070400000' },
            idGuild3: { name: 'User/Group n°3', voctime: '2629743000' },
            idGuild4: { name: 'User/Group n°4', voctime: '1209600000' },
            idGuild5: { name: 'User/Group n°5', voctime: '604800000' },
            idGuild6: { name: 'User/Group n°6', voctime: '345600000' },
            idGuild7: { name: 'User/Group n°7', voctime: '172800000' },
            idGuild8: { name: 'User/Group n°8', voctime: '86400000' },
            idGuild9: { name: 'User/Group n°9', voctime: '43200000' },
            idGuild10: { name: 'User/Group n°10', voctime: '14400000' },
        },

        ...(!removeAnalytics && {
            openCount: randomNumber(200, 300),
            averageOpenCountPerDay: randomNumber(3, 5),
            notificationCount: randomNumber(200, 400),
            joinVoiceChannelCount: randomNumber(40, 100),
            joinCallCount: randomNumber(20, 30),
            addReactionCount: randomNumber(100, 200),
            messageEditedCount: randomNumber(50, 70),
            sentMessageCount: randomNumber(200, 600),
            averageMessageCountPerDay: randomNumber(20, 30),
            slashCommandUsedCount: randomNumber(10, 20)
        })
    };
};
