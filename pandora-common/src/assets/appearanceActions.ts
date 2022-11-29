import { z } from 'zod';
import { CharacterId, CharacterIdSchema } from '../character';
import { AssertNever } from '../utility';
import { HexColorString, HexColorStringSchema } from '../validation';
import { ArmsPose, CharacterView } from './appearance';
import { AssetManager } from './assetManager';
import { AssetIdSchema } from './definitions';
import { AppearanceActionHandler, AppearanceActionProcessingContext, ItemContainerPath, ItemContainerPathSchema, ItemIdSchema, ItemPath, ItemPathSchema, RoomActionTarget, RoomTargetSelector, RoomTargetSelectorSchema } from './appearanceTypes';
import { CharacterRestrictionsManager, ItemInteractionType } from '../character/restrictionsManager';
import { ItemModuleAction, ItemModuleActionSchema } from './modules';
import { Item } from './item';
import { AppearanceRootManipulator } from './appearanceHelpers';
import { AppearanceItems } from './appearanceValidation';

export const AppearanceActionCreateSchema = z.object({
	type: z.literal('create'),
	/** ID to give the new item */
	itemId: ItemIdSchema,
	/** Asset to create the new item from */
	asset: AssetIdSchema,
	/** Target the item should be added to after creation */
	target: RoomTargetSelectorSchema,
	/** Container path on target where to add the item to */
	container: ItemContainerPathSchema,
});

export const AppearanceActionDeleteSchema = z.object({
	type: z.literal('delete'),
	/** Target with the item to delete */
	target: RoomTargetSelectorSchema,
	/** Path to the item to delete */
	item: ItemPathSchema,
});

export const AppearanceActionPose = z.object({
	type: z.literal('pose'),
	target: CharacterIdSchema,
	pose: z.record(z.string(), z.number().optional()),
	armsPose: z.nativeEnum(ArmsPose).optional(),
});

export const AppearanceActionBody = z.object({
	type: z.literal('body'),
	target: CharacterIdSchema,
	pose: z.record(z.string(), z.number().optional()),
});

export const AppearanceActionSetView = z.object({
	type: z.literal('setView'),
	target: CharacterIdSchema,
	view: z.nativeEnum(CharacterView),
});

export const AppearanceActionMove = z.object({
	type: z.literal('move'),
	/** Target with the item to move */
	target: RoomTargetSelectorSchema,
	/** Path to the item to move */
	item: ItemPathSchema,
	/** Relative shift for the item inside its container */
	shift: z.number().int(),
});

export const AppearanceActionColor = z.object({
	type: z.literal('color'),
	/** Target with the item to color */
	target: RoomTargetSelectorSchema,
	/** Path to the item to color */
	item: ItemPathSchema,
	/** The new color to set */
	color: z.array(HexColorStringSchema),
});

export const AppearanceActionModuleAction = z.object({
	type: z.literal('moduleAction'),
	/** Target with the item to color */
	target: RoomTargetSelectorSchema,
	/** Path to the item to interact with */
	item: ItemPathSchema,
	/** The module to interact with */
	module: z.string(),
	/** Action to do on the module */
	action: ItemModuleActionSchema,
});

export const AppearanceActionSchema = z.discriminatedUnion('type', [
	AppearanceActionCreateSchema,
	AppearanceActionDeleteSchema,
	AppearanceActionPose,
	AppearanceActionBody,
	AppearanceActionSetView,
	AppearanceActionMove,
	AppearanceActionColor,
	AppearanceActionModuleAction,
]);
export type AppearanceAction = z.infer<typeof AppearanceActionSchema>;

export interface AppearanceActionContext {
	player: CharacterId;
	getTarget(target: RoomTargetSelector): RoomActionTarget | null;
	getCharacter(id: CharacterId): CharacterRestrictionsManager | null;
	/** Handler for sending messages to chat */
	actionHandler?: AppearanceActionHandler;
}

export function DoAppearanceAction(
	action: AppearanceAction,
	context: AppearanceActionContext,
	assetManager: AssetManager,
	{
		dryRun = false,
	}: {
		dryRun?: boolean;
	} = {},
): boolean {
	const player = context.getCharacter(context.player);
	if (!player)
		return false;

	const processingContext: AppearanceActionProcessingContext = {
		sourceCharacter: context.player,
		actionHandler: context.actionHandler,
		dryRun,
	};

	switch (action.type) {
		// Create and equip an item
		case 'create': {
			const asset = assetManager.getAssetById(action.asset);
			const target = context.getTarget(action.target);
			if (!asset || !target)
				return false;
			const item = assetManager.createItem(action.itemId, asset, null);
			// Player adding the item must be able to use it
			if (!player.canUseItemDirect(target, action.container, item, ItemInteractionType.ADD_REMOVE))
				return false;

			const manipulator = target.getManipulator();
			if (!ActionAddItem(manipulator, action.container, item))
				return false;
			return target.commitChanges(manipulator, processingContext);
		}
		// Unequip and delete an item
		case 'delete': {
			const target = context.getTarget(action.target);
			if (!target)
				return false;
			// Player removing the item must be able to use it
			if (!player.canUseItem(target, action.item, ItemInteractionType.ADD_REMOVE))
				return false;

			const manipulator = target.getManipulator();
			if (!ActionRemoveItem(manipulator, action.item))
				return false;
			return target.commitChanges(manipulator, processingContext);
		}
		// Moves an item within inventory, reordering the worn order
		case 'move': {
			const target = context.getTarget(action.target);
			if (!target)
				return false;
			// Player moving the item must be able to interact with the item
			if (!player.canUseItem(target, action.item, ItemInteractionType.ADD_REMOVE))
				return false;

			const manipulator = target.getManipulator();
			if (!ActionMoveItem(manipulator, action.item, action.shift))
				return false;
			return target.commitChanges(manipulator, processingContext);
		}
		// Changes the color of an item
		case 'color': {
			const target = context.getTarget(action.target);
			if (!target)
				return false;
			// Player coloring the item must be able to interact with the item
			if (!player.canUseItem(target, action.item, ItemInteractionType.STYLING))
				return false;

			const manipulator = target.getManipulator();
			if (!ActionColorItem(manipulator, action.item, action.color))
				return false;
			return target.commitChanges(manipulator, processingContext);
		}
		// Module-specific action
		case 'moduleAction': {
			const target = context.getTarget(action.target);
			if (!target)
				return false;
			// Player doing the action must be able to interact with the item
			if (!player.canUseItemModule(target, action.item, action.module))
				return false;

			const manipulator = target.getManipulator();
			if (!ActionModuleAction(manipulator, action.item, action.module, action.action))
				return false;
			return target.commitChanges(manipulator, processingContext);
		}
		// Resize body or change pose
		case 'body':
			if (context.player !== action.target)
				return false;
		// falls through
		case 'pose': {
			const target = context.getCharacter(action.target);
			if (!target)
				return false;
			if (!dryRun) {
				target.appearance.importPose(action.pose, action.type, false);
				if ('armsPose' in action && action.armsPose != null) {
					target.appearance.setArmsPose(action.armsPose);
				}
			}
			return true;
		}
		// Changes view of the character - front or back
		case 'setView': {
			const target = context.getCharacter(action.target);
			if (!target)
				return false;
			if (!dryRun) {
				target.appearance.setView(action.view);
			}
			return true;
		}
		default:
			AssertNever(action);
	}
}

export function ActionAddItem(rootManipulator: AppearanceRootManipulator, container: ItemContainerPath, item: Item): boolean {
	const manipulator = rootManipulator.getContainer(container);

	// Do change
	let removed: AppearanceItems = [];
	// if this is a bodypart not allowing multiple do a swap instead, but only in root
	if (manipulator.isCharacter && item.asset.definition.bodypart && manipulator.assetMananger.bodyparts.find((bp) => bp.name === item.asset.definition.bodypart)?.allowMultiple === false) {
		removed = manipulator.removeMatchingItems((oldItem) => oldItem.asset.definition.bodypart === item.asset.definition.bodypart);
	}
	if (!manipulator.addItem(item))
		return false;

	// Change message to chat
	if (removed.length > 0) {
		manipulator.queueMessage({
			id: 'itemReplace',
			item: {
				assetId: item.asset.id,
			},
			itemPrevious: {
				assetId: removed[0].asset.id,
			},
		});
	} else {
		const manipulatorContainer = manipulator.container;
		manipulator.queueMessage({
			id: !manipulatorContainer ? 'itemAdd' : manipulatorContainer.contentsPhysicallyEquipped ? 'itemAttach' : 'itemStore',
			item: {
				assetId: item.asset.id,
			},
		});
	}

	return true;
}

export function ActionRemoveItem(rootManipulator: AppearanceRootManipulator, itemPath: ItemPath): boolean {
	const { container, itemId } = itemPath;
	const manipulator = rootManipulator.getContainer(container);

	// Do change
	const removedItems = manipulator.removeMatchingItems((i) => i.id === itemId);

	// Validate
	if (removedItems.length !== 1)
		return false;

	// Change message to chat
	const manipulatorContainer = manipulator.container;
	manipulator.queueMessage({
		id: !manipulatorContainer ? 'itemRemove' : manipulatorContainer.contentsPhysicallyEquipped ? 'itemDetach' : 'itemUnload',
		item: {
			assetId: removedItems[0].asset.id,
		},
	});

	return true;
}

export function ActionMoveItem(rootManipulator: AppearanceRootManipulator, itemPath: ItemPath, shift: number): boolean {
	const { container, itemId } = itemPath;
	const manipulator = rootManipulator.getContainer(container);

	// Do change
	if (!manipulator.moveItem(itemId, shift))
		return false;

	// Change message to chat
	// TODO: Message to chat that items were reordered
	// Will need mechanism to rate-limit the messages not to send every reorder

	return true;
}

export function ActionColorItem(rootManipulator: AppearanceRootManipulator, itemPath: ItemPath, color: readonly HexColorString[]): boolean {
	const { container, itemId } = itemPath;
	const manipulator = rootManipulator.getContainer(container);

	// Do change
	if (!manipulator.modifyItem(itemId, (it) => it.changeColor(color)))
		return false;

	// Change message to chat
	// TODO: Message to chat that item was colored
	// Will need mechanism to rate-limit the messages not to send every color change

	return true;
}

export function ActionModuleAction(rootManipulator: AppearanceRootManipulator, itemPath: ItemPath, module: string, action: ItemModuleAction): boolean {
	const { container, itemId } = itemPath;
	const manipulator = rootManipulator.getContainer(container);

	// Do change and store chat messages
	if (!manipulator.modifyItem(itemId, (it) => it.moduleAction(
		module,
		action,
		(m) => manipulator.queueMessage({
			item: {
				assetId: it.asset.id,
			},
			...m,
		}),
	))) {
		return false;
	}

	return true;
}
