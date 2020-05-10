import { objectToArray, shuffle, populateRoleList } from './utility.mjs';
import Quest from './quest.mjs';

export const GoodTeam = new Set(['Merlin', 'Loyal Servant of Arthur', 'Percival']);

// defines what type of character roles for size of game
// key: number of players
// value: object of game roles and how many
const BaseRoles = {
  5: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 2,
    'Minion of Mordred': 1
  },
  6: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 3,
    'Minion of Mordred': 1
  },
  7: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 3,
    'Minion of Mordred': 2
  },
  8: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 4,
    'Minion of Mordred': 2
  },
  9: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 5,
    'Minion of Mordred': 2
  },
  10: {
    'Merlin': 1,
    'Assassin': 1,
    'Loyal Servant of Arthur': 5,
    'Minion of Mordred': 3
  }
};

export default class Game {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.chat = [];
    this.gameIsStarted = false;
    this.gameState = {
      questMsg: null,
      showAcceptOrRejectTeamBtns: false,
      showSucceedOrFailQuestBtns: false
    };
    this.roleList = null;
    this.players = [];
    this.quests = null;
    this.questFails = 0;
    this.questSuccesses = 0;
    this.leaderIndex = 0;
  }

  static get BaseRoles() {
    return BaseRoles;
  }
  static get GoodTeam() {
    return GoodTeam;
  }

  /**
   * @param {Object} optionalRoles 
   */
  startGame(optionalRoles) {
    this.gameIsStarted = true;
    this.initializeQuests();
    this.assignRoles(optionalRoles);
    this.assignFirstLeader();
  }

  initializeQuests() {
    this.quests = {
      1: new Quest(1, this.players.length),
      2: new Quest(2, this.players.length),
      3: new Quest(3, this.players.length),
      4: new Quest(4, this.players.length, this.players.length > 6),
      5: new Quest(5, this.players.length)
    };
    this.quests[1].currentQuest = true;
  }

  getCurrentQuest() {
    for (let i in this.quests) {
      if (this.quests[i].currentQuest === true) {
        return this.quests[i];
      }
    }
  }

  /**
   * @param {Number} questNum 
   * @param {String} name 
   */
  addPlayerToQuest(questNum, name) {
    for (let i in this.players) {
      if (this.players[i].name === name && this.quests[questNum].playersNeededLeft > 0 && !this.players[i].onQuest) {
        this.players[i].onQuest = true;
        this.quests[questNum].addPlayer(name);
        return true;
      }
    }
    return false;
  }

  /**
   * @param {Number} questNum 
   * @param {String} name 
   */
  removePlayerFromQuest(questNum, name) {
    for (let i in this.players) {
      if (this.players[i].name === name) {
        this.players[i].onQuest = false;
        this.quests[questNum].removePlayer(name);
        return true;
      }
    }
    return false;
  }

  getPlayerBy(property, value) {
    return this.players.find(player => player[property] === value);
  }

  /**
   * @param {String} socketID 
   */
  deletePlayer(socketID) {
    for (let i in this.players) {
      if (this.players[i].socketID === socketID) {
        this.players.splice(i, 1); //delete 1 player element at index i
        break;
      }
    }
  }

  assignFirstLeader() {
    // const randomNumber = Math.floor(Math.random() * Math.floor(this.players.length));
    for (let i in this.players) {
      if (this.players[i] != null) {
        this.players[i].leader = true;
        this.leaderIndex = i;
        this.quests[1].assignLeaderInfo({ name: this.players[i].name, socketID: this.players[i].socketID });
        break;
      }
    }
  }

  /**
   * Assign next room leader (goes in order incrementally always)
   * @param {Number} questNum 
   */
  assignNextLeader(questNum) {
    this.players[this.leaderIndex].leader = false; //reset prev leader Player object
    this.resetPlayersProperty('onQuest');
    this.quests[questNum].resetQuest();

    //increment leaderIndex (mod by playerLength so it wraps around)
    this.leaderIndex = (this.leaderIndex + 1) % this.players.length;

    //continue incrementing leaderIndex until we find next non-null player object
    while (this.players[this.leaderIndex] === null) {
      this.leaderIndex = (this.leaderIndex + 1) % this.players.length;
    }
    //assign new leader to correct Player
    this.players[this.leaderIndex].leader = true;
    this.quests[questNum].assignLeaderInfo({
      name: this.players[this.leaderIndex].name,
      socketID: this.players[this.leaderIndex].socketID
    });
  }

  /**
   * @param {Object} optionalRoles 
   */
  assignRoles(optionalRoles) {
    let shuffledIdentities;
    let teamObj = Game.BaseRoles[this.players.length];
    if (optionalRoles.length > 0) {
      teamObj = JSON.parse(JSON.stringify(Game.BaseRoles[this.players.length]));
      optionalRoles.forEach(optionalRole => {
        switch (optionalRole) {
          case 'Percival':
            teamObj['Loyal Servant of Arthur']--;
            teamObj['Percival'] = 1;
            break;
          case 'Mordred':
            teamObj['Minion of Mordred']--;
            teamObj['Mordred'] = 1;
            break;
          case 'Oberon':
            teamObj['Minion of Mordred']--;
            teamObj['Oberon'] = 1;
            break;
          case 'Morgana':
            teamObj['Minion of Mordred']--;
            teamObj['Morgana'] = 1;
            break;
        }
      });
    }
    this.roleList = populateRoleList(teamObj);
    shuffledIdentities = shuffle(objectToArray(teamObj));
    for (let i in this.players) {
      this.players[i].role = shuffledIdentities[i];
      this.players[i].team = Game.GoodTeam.has(shuffledIdentities[i]) ? 'Good' : 'Evil';
    }
  }

  resetPlayersProperty(property) {
    this.players.forEach(player => {
      player[property] = false;
    });
  }

  /**
   * @param {Number} lastQuestNum 
   */
  startNextQuest(lastQuestNum) {
    if (lastQuestNum < 5) {
      this.quests[lastQuestNum].currentQuest = false;
      this.quests[lastQuestNum + 1].currentQuest = true;
      this.assignNextLeader(lastQuestNum + 1);
    }
  }

}
