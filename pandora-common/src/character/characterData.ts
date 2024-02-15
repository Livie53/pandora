import { z } from 'zod';
import { AccountIdSchema } from '../account';
import { AppearanceBundleSchema } from '../assets/state/characterStateTypes';
import { RoomInventoryBundleSchema } from '../assets/state/roomState';
import { InteractionSystemDataSchema } from '../gameLogic/interactions/interactionData';
import { LIMIT_CHARACTER_PROFILE_LENGTH } from '../inputLimits';
import type { SpaceId } from '../space/space';
import { ArrayToRecordKeys } from '../utility';
import { CharacterNameSchema, HexColorStringSchema, ZodTruncate } from '../validation';
import { ASSET_PREFERENCES_DEFAULT, AssetPreferencesServerSchema } from './assetPreferences';
import { CharacterId, CharacterIdSchema } from './characterTypes';
import { PronounKeySchema } from './pronouns';

// Fix for pnpm resolution weirdness
import type { } from '../assets/item/base';

export const CharacterPublicSettingsSchema = z.object({
	labelColor: HexColorStringSchema.catch('#ffffff'),
	pronoun: PronounKeySchema.catch('she'),
});
export type ICharacterPublicSettings = z.infer<typeof CharacterPublicSettingsSchema>;

export const CHARACTER_DEFAULT_PUBLIC_SETTINGS: Readonly<ICharacterPublicSettings> = {
	labelColor: '#ffffff',
	pronoun: 'she',
};

export const CharacterRoomPositionSchema = z.tuple([z.number().int(), z.number().int(), z.number().int()])
	.catch([0, 0, 0])
	.readonly();
export type CharacterRoomPosition = readonly [x: number, y: number, yOffset: number];

/** Data about character, that is visible to everyone in the same space */
export const CharacterPublicDataSchema = z.object({
	id: CharacterIdSchema,
	accountId: AccountIdSchema,
	name: CharacterNameSchema,
	profileDescription: z.string().default('').transform(ZodTruncate(LIMIT_CHARACTER_PROFILE_LENGTH)),
	settings: CharacterPublicSettingsSchema.default(CHARACTER_DEFAULT_PUBLIC_SETTINGS),
});
/** Data about character, that is visible to everyone in the same space */
export type ICharacterPublicData = z.infer<typeof CharacterPublicDataSchema>;

export type ICharacterMinimalData = Pick<ICharacterPublicData, 'id' | 'name' | 'accountId'>;

/** Data about character, that is visible only to the character itself */
export const CharacterPrivateDataSchema = CharacterPublicDataSchema.extend({
	inCreation: z.literal(true).optional(),
	created: z.number(),
});
/** Data about character, that is visible only to the character itself */
export type ICharacterPrivateData = z.infer<typeof CharacterPrivateDataSchema>;

/** Data about character, as seen by server */
export const CharacterDataSchema = CharacterPrivateDataSchema.extend({
	accessId: z.string(),
	appearance: AppearanceBundleSchema.optional(),
	// TODO(spaces): Migrate this to be a personalSpace data
	personalRoom: z.object({
		inventory: z.lazy(() => RoomInventoryBundleSchema),
	}).optional(),
	interactionConfig: InteractionSystemDataSchema.optional(),
	assetPreferences: AssetPreferencesServerSchema.default(ASSET_PREFERENCES_DEFAULT),
	// TODO(spaces): Move this to be part of character state (roomId is used to reset position when room changes)
	roomId: z.string().nullable().optional().catch(undefined),
	position: CharacterRoomPositionSchema,
});
/** Data about character, as seen by server */
export type ICharacterData = z.infer<typeof CharacterDataSchema>;

export const CHARACTER_DIRECTORY_UPDATEABLE_PROPERTIES = [
	'accessId',
] as const satisfies readonly (keyof ICharacterData)[];
export const CharacterDataDirectoryUpdateSchema = CharacterDataSchema.pick(ArrayToRecordKeys(CHARACTER_DIRECTORY_UPDATEABLE_PROPERTIES, true)).partial();
export type ICharacterDataDirectoryUpdate = z.infer<typeof CharacterDataDirectoryUpdateSchema>;

export const CHARACTER_SHARD_UPDATEABLE_PROPERTIES = [
	'name',
	'profileDescription',
	'appearance',
	'personalRoom',
	'position',
	'roomId',
	'settings',
	'interactionConfig',
	'assetPreferences',
] as const satisfies readonly Exclude<keyof ICharacterData, ((typeof CHARACTER_DIRECTORY_UPDATEABLE_PROPERTIES)[number])>[];
export const CharacterDataShardUpdateSchema = CharacterDataSchema.pick(ArrayToRecordKeys(CHARACTER_SHARD_UPDATEABLE_PROPERTIES, true)).partial();
export type ICharacterDataShardUpdate = z.infer<typeof CharacterDataShardUpdateSchema>;

export type ICharacterSelfInfo = {
	id: CharacterId;
	name: string;
	preview: string;
	state: string;
	// TODO(spaces): This might need migration
	currentRoom?: SpaceId | null;
	inCreation?: true;
};

export type ICharacterSelfInfoUpdateProperties = 'preview' | 'currentRoom';
export type ICharacterSelfInfoUpdate = Pick<ICharacterSelfInfo, 'id'> & Partial<Pick<ICharacterSelfInfo, ICharacterSelfInfoUpdateProperties>>;
