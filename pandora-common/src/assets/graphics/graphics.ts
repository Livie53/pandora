import { z } from 'zod';
import type { AssetId } from '../base';
import { RectangleSchema } from './common';
import { type PointTemplate } from './points';
import { BoneNameSchema, ConditionSchema, type BoneType } from './conditions';

// Fix for pnpm resolution weirdness
import type { } from '../../validation';

export const CharacterSize = {
	WIDTH: 1000,
	HEIGHT: 1500,
} as const;

export interface BoneDefinition {
	name: string;
	x: number;
	y: number;
	baseRotation?: number;
	mirror?: BoneDefinition;
	isMirror: boolean;
	parent?: BoneDefinition;
	type: BoneType;
}

export interface BoneState {
	readonly definition: BoneDefinition;
	readonly rotation: number;
}

export const LayerImageOverrideSchema = z.object({
	image: z.string(),
	/**
	 * Pose to use for calculating UV coordinates of vertices.
	 *
	 * EXPERIMENTAL - subject to change, will likely be merged with `scaling` options soon.
	 */
	uvPose: z.record(BoneNameSchema, z.number()).optional(),
	condition: ConditionSchema,
});
export type LayerImageOverride = z.infer<typeof LayerImageOverrideSchema>;

export const LAYER_PRIORITIES = [
	'BACKGROUND',
	'BELOW_BACK_HAIR',
	'BACK_HAIR',

	'BELOW_BODY_SOLES',
	'BODY_SOLES',
	'BELOW_BODY',
	'BODY',
	'BELOW_BREASTS',
	'BREASTS',
	'ABOVE_BODY',

	'BELOW_ARM_LEFT',
	'ARM_LEFT',
	'ABOVE_ARM_LEFT',

	'BELOW_ARM_RIGHT',
	'ARM_RIGHT',
	'ABOVE_ARM_RIGHT',

	'FRONT_HAIR',
	'ABOVE_FRONT_HAIR',
	'OVERLAY',
] as const;

export const LayerPrioritySchema = z.enum(LAYER_PRIORITIES);
export type LayerPriority = z.infer<typeof LayerPrioritySchema>;

export enum LayerMirror {
	NONE,
	/** Only imageOverrides are mirrored, points are selected */
	SELECT,
	/** Mirrors everything and creates the mirrored image */
	FULL,
}
export const LayerMirrorSchema = z.nativeEnum(LayerMirror);

export enum LayerSide {
	LEFT,
	RIGHT,
}

export const LayerImageSettingSchema = z.object({
	image: z.string(),
	/**
	 * Pose to use for calculating UV coordinates of vertices.
	 *
	 * EXPERIMENTAL - subject to change, will likely be merged with `scaling` options soon.
	 */
	uvPose: z.record(BoneNameSchema, z.number()).optional(),
	overrides: z.array(LayerImageOverrideSchema),
	alphaImage: z.string().min(1).optional(),
	alphaOverrides: z.array(LayerImageOverrideSchema).min(1).optional(),
}).strict();
export type LayerImageSetting = z.infer<typeof LayerImageSettingSchema>;

export const LayerDefinitionSchema = RectangleSchema.extend({
	name: z.string().optional(),
	priority: LayerPrioritySchema,
	points: z.string(),
	pointType: z.array(z.string()).optional(),
	mirror: LayerMirrorSchema,
	colorizationKey: z.string().optional(),

	image: LayerImageSettingSchema,
	scaling: z.object({
		scaleBone: BoneNameSchema,
		stops: z.array(z.tuple([z.number(), LayerImageSettingSchema])),
	}).optional(),
}).strict();
export type LayerDefinition = z.infer<typeof LayerDefinitionSchema>;

export const AssetGraphicsDefinitionSchema = z.object({
	layers: z.array(LayerDefinitionSchema),
}).strict();
export type AssetGraphicsDefinition = z.infer<typeof AssetGraphicsDefinitionSchema>;

export interface AssetsGraphicsDefinitionFile {
	assets: Record<AssetId, AssetGraphicsDefinition>;
	pointTemplates: Record<string, PointTemplate>;
	imageFormats: Partial<Record<'avif' | 'webp', string>>;
}
