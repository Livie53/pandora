import { AppearanceItems, AppearanceValidationResult } from '../appearanceValidation';
import { Assert, MemoizeNoArg } from '../../utility';
import { freeze } from 'immer';
import { z } from 'zod';
import { Item, ItemBundleSchema } from '../item';
import { AssetManager } from '../assetManager';
import { Logger } from '../../logging';
import { RoomInventoryLoadAndValidate, ValidateRoomInventoryItems } from '../roomValidation';
import type { IExportOptions } from '../modules/common';
import { ZodArrayWithInvalidDrop } from '../../validation';

// Fix for pnpm resolution weirdness
import type { } from '../item/base';

export const RoomInventoryBundleSchema = z.object({
	items: ZodArrayWithInvalidDrop(ItemBundleSchema, z.record(z.unknown())),
	clientOnly: z.boolean().optional(),
});

export type RoomInventoryBundle = z.infer<typeof RoomInventoryBundleSchema>;
export type RoomInventoryClientBundle = RoomInventoryBundle & { clientOnly: true; };

export const ROOM_INVENTORY_BUNDLE_DEFAULT: RoomInventoryBundle = {
	items: [],
};

/**
 * State of an room. Immutable.
 */
export class AssetFrameworkRoomState {
	public readonly type = 'roomInventory';
	public readonly assetManager: AssetManager;

	public readonly items: AppearanceItems;

	private constructor(
		assetManager: AssetManager,
		items: AppearanceItems,
	) {
		this.assetManager = assetManager;
		this.items = items;
	}

	public isValid(): boolean {
		return this.validate().success;
	}

	@MemoizeNoArg
	public validate(): AppearanceValidationResult {
		{
			const r = ValidateRoomInventoryItems(this.assetManager, this.items);
			if (!r.success)
				return r;
		}

		return {
			success: true,
		};
	}

	public exportToBundle(options: IExportOptions = {}): RoomInventoryBundle {
		return {
			items: this.items.map((item) => item.exportToBundle(options)),
		};
	}

	public exportToClientBundle(options: IExportOptions = {}): RoomInventoryClientBundle {
		options.clientOnly = true;
		return {
			items: this.items.map((item) => item.exportToBundle(options)),
			clientOnly: true,
		};
	}

	public produceWithItems(newItems: AppearanceItems): AssetFrameworkRoomState {
		return new AssetFrameworkRoomState(
			this.assetManager,
			newItems,
		);
	}

	public static createDefault(assetManager: AssetManager): AssetFrameworkRoomState {
		return AssetFrameworkRoomState.loadFromBundle(assetManager, ROOM_INVENTORY_BUNDLE_DEFAULT, undefined);
	}

	public static loadFromBundle(assetManager: AssetManager, bundle: RoomInventoryBundle, logger: Logger | undefined): AssetFrameworkRoomState {
		const parsed = RoomInventoryBundleSchema.parse(bundle);

		// Load all items
		const loadedItems: Item[] = [];
		for (const itemBundle of parsed.items) {
			// Load asset and skip if unknown
			const asset = assetManager.getAssetById(itemBundle.asset);
			if (asset === undefined) {
				logger?.warning(`Skipping unknown asset ${itemBundle.asset}`);
				continue;
			}

			const item = assetManager.loadItemFromBundle(asset, itemBundle, logger);
			loadedItems.push(item);
		}

		// Validate and add all items
		const newItems = RoomInventoryLoadAndValidate(assetManager, loadedItems, logger);

		// Create the final state
		const resultState = freeze(new AssetFrameworkRoomState(
			assetManager,
			newItems,
		), true);

		Assert(resultState.isValid(), 'State is invalid after load');

		return resultState;
	}
}
