import { CharacterId, GetLogger, IChatRoomClientData, IChatRoomMessage, Logger, IChatRoomFullInfo, RoomId, AssertNever, IChatRoomMessageBase, IChatroomMessageDirectoryAction } from 'pandora-common';
import type { Character } from '../character/character';
import _, { omit } from 'lodash';

export class Room {

	private readonly data: IChatRoomFullInfo;
	private readonly characters: Set<Character> = new Set();

	public get id(): RoomId {
		return this.data.id;
	}

	private logger: Logger;

	constructor(data: IChatRoomFullInfo) {
		this.data = data;
		this.logger = GetLogger('Room', `[Room ${data.id}]`);
		this.logger.verbose('Created');
	}

	public update(data: IChatRoomFullInfo): void {
		if (data.id !== this.data.id) {
			throw new Error('Chatroom id cannot change');
		}
		for (const key of Object.keys(data) as (keyof IChatRoomFullInfo)[]) {
			(this.data as Record<string, unknown>)[key] = data[key];
		}
		this.sendUpdateToAllInRoom();
	}

	getInfo(): IChatRoomFullInfo {
		return this.data;
	}

	getClientData(): IChatRoomClientData {
		return {
			...this.getInfo(),
			characters: Array.from(this.characters).map((c) => ({
				name: c.name,
				id: c.id,
				accountId: c.accountId,
				appearance: c.appearance.exportToBundle(),
			})),
		};
	}

	getAllCharacters(): Character[] {
		return [...this.characters.values()];
	}

	getCharacterById(id: CharacterId): Character | null {
		return Array.from(this.characters.values()).find((c) => c.id === id) ?? null;
	}

	public characterEnter(character: Character): void {
		this.characters.add(character);
		character.room = this;
		this.sendUpdateToAllInRoom();
		this.logger.verbose(`Character ${character.id} entered`);
	}

	public characterLeave(character: Character): void {
		this.characters.delete(character);
		character.room = null;
		character.connection?.sendMessage('chatRoomUpdate', { room: null });
		this.logger.verbose(`Character ${character.id} left`);
		this.sendUpdateToAllInRoom();
	}

	public sendUpdateTo(character: Character): void {
		character.connection?.sendMessage('chatRoomUpdate', { room: this.getClientData() });
	}

	public sendUpdateToAllInRoom(): void {
		const room = this.getClientData();
		for (const character of this.characters) {
			character.connection?.sendMessage('chatRoomUpdate', { room });
		}
	}

	private lastMessageTime: number = 0;
	private lastDirectoryMessageTime: number = 0;

	private nextMessageTime(): number {
		let time = Date.now();
		// Make sure the time is unique
		if (time <= this.lastMessageTime) {
			time = this.lastMessageTime + 1;
		}
		return this.lastMessageTime = time;
	}

	public sendMessage(...messages: IChatRoomMessageBase[]): void {
		const processedMessages = messages.map<IChatRoomMessage>(
			(msg) => ({
				time: this.nextMessageTime(),
				...msg,
			}),
		);
		for (const character of this.characters) {
			character.queueMessages(processedMessages.filter((msg) => {
				if (msg.type === 'chat') {
					return msg.to === undefined || character.id === msg.from || character.id === msg.to;
				} else if (msg.type === 'emote' || msg.type === 'me') {
					return true;
				} else if (msg.type === 'action' || msg.type === 'serverMessage') {
					return true;
				}
				AssertNever(msg.type);
			}));
		}
	}

	public processDirectoryMessages(messages: IChatroomMessageDirectoryAction[]): void {
		this.sendMessage(
			...messages
				.filter((m) => m.directoryTime > this.lastDirectoryMessageTime)
				.map((m) => omit(m, ['directoryTime'])),
		);
		this.lastDirectoryMessageTime = _(messages)
			.map((m) => m.directoryTime)
			.concat(this.lastDirectoryMessageTime)
			.max() ?? this.lastDirectoryMessageTime;
	}
}
