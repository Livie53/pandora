import type { SocketInterfaceRequest, SocketInterfaceResponse, SocketInterfaceHandlerResult, SocketInterfaceHandlerPromiseResult, SocketInterfaceDefinitionVerified, SocketInterfaceDefinition } from './helpers';
import type { CharacterId } from '../character/characterTypes';
import type { CharacterRoomPosition, ICharacterPrivateData, ICharacterPublicData } from '../character/characterData';
import type { IChatRoomFullInfo } from '../chatroom';
import type { AssetsDefinitionFile } from '../assets/definitions';
import type { IChatRoomMessage, IChatRoomStatus } from '../chatroom/chat';
import { ZodCast } from '../validation';
import { Satisfies } from '../utility';
import { AssetFrameworkGlobalStateClientBundle } from '../assets/state/globalState';
import { Immutable } from 'immer';

// Fix for pnpm resolution weirdness
import type { } from 'zod';
import type { } from '../assets/appearance';
import type { } from '../character/pronouns';

export type ICharacterRoomData = ICharacterPublicData & {
	position: CharacterRoomPosition;
	isOnline: boolean;
};

export type IChatRoomLoad = {
	globalState: AssetFrameworkGlobalStateClientBundle;
	room: null | {
		info: IChatRoomFullInfo;
		characters: ICharacterRoomData[];
	};
};

export type IChatRoomUpdate = {
	globalState?: AssetFrameworkGlobalStateClientBundle;
	info?: Partial<IChatRoomFullInfo>;
	leave?: CharacterId;
	join?: ICharacterRoomData;
	characters?: Record<CharacterId, Partial<ICharacterRoomData>>;
};

export type IShardClientChangeEvents = 'permissions';

/** Shard->Client messages */
export const ShardClientSchema = {
	load: {
		request: ZodCast<{
			character: ICharacterPrivateData;
			globalState: AssetFrameworkGlobalStateClientBundle;
			room: null | {
				info: IChatRoomFullInfo;
				characters: ICharacterRoomData[];
			};
			assetsDefinition: Immutable<AssetsDefinitionFile>;
			assetsDefinitionHash: string;
			assetsSource: string;
		}>(),
		response: null,
	},
	updateCharacter: {
		request: ZodCast<Partial<ICharacterPrivateData>>(),
		response: null,
	},
	chatRoomLoad: {
		request: ZodCast<IChatRoomLoad>(),
		response: null,
	},
	chatRoomUpdate: {
		request: ZodCast<IChatRoomUpdate>(),
		response: null,
	},
	chatRoomMessage: {
		request: ZodCast<{
			messages: IChatRoomMessage[];
		}>(),
		response: null,
	},
	chatRoomStatus: {
		request: ZodCast<{
			id: CharacterId;
			status: IChatRoomStatus;
		}>(),
		response: null,
	},
	somethingChanged: {
		request: ZodCast<{
			changes: IShardClientChangeEvents[];
		}>(),
		response: null,
	},
} as const satisfies Immutable<SocketInterfaceDefinition>;

export type IShardClient = Satisfies<typeof ShardClientSchema, SocketInterfaceDefinitionVerified<typeof ShardClientSchema>>;
export type IShardClientArgument = SocketInterfaceRequest<IShardClient>;
export type IShardClientResult = SocketInterfaceHandlerResult<IShardClient>;
export type IShardClientPromiseResult = SocketInterfaceHandlerPromiseResult<IShardClient>;
export type IShardClientNormalResult = SocketInterfaceResponse<IShardClient>;
