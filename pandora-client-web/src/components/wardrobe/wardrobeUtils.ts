import {
	ActionSpaceContext,
	AppearanceAction,
	AppearanceActionProcessingResult,
	AppearanceItems,
	Assert,
	AssertNever,
	AssertNotNullable,
	EMPTY_ARRAY,
	Item,
	ItemPath,
} from 'pandora-common';
import { EvalItemPath } from 'pandora-common/dist/assets/appearanceHelpers';
import { useMemo } from 'react';
import { ICharacter } from '../../character/character';
import { useWardrobeContext } from './wardrobeContext';
import { WardrobeFocus, WardrobeTarget } from './wardrobeTypes';

export function WardrobeFocusesItem(focus: WardrobeFocus): focus is ItemPath {
	return focus.itemId != null;
}

export function useWardrobeTargetItems(target: WardrobeTarget | null): AppearanceItems {
	const { globalState } = useWardrobeContext();

	const items = useMemo<AppearanceItems | null>(() => {
		if (target == null) {
			return null;
		} else if (target.type === 'character') {
			return globalState.getItems({
				type: 'character',
				characterId: target.id,
			});
		} else if (target.type === 'room') {
			return globalState.getItems({
				type: 'roomInventory',
			});
		}
		AssertNever(target);
	}, [globalState, target]);

	return items ?? EMPTY_ARRAY;
}

export function useWardrobeTargetItem(target: WardrobeTarget | null, itemPath: ItemPath | null | undefined): Item | undefined {
	const items = useWardrobeTargetItems(target);

	return useMemo(() => {
		if (!itemPath)
			return undefined;

		const { container, itemId } = itemPath;

		let current: AppearanceItems = items;
		for (const step of container) {
			const item = current.find((it) => it.id === step.item);
			if (!item)
				return undefined;
			current = item.getModuleItems(step.module);
		}
		return current.find((it) => it.id === itemId);
	}, [items, itemPath]);
}

export function WardrobeCheckResultForConfirmationWarnings(
	player: ICharacter,
	spaceContext: ActionSpaceContext | null,
	action: AppearanceAction,
	result: AppearanceActionProcessingResult,
): string[] {
	if (!result.valid) {
		Assert(result.prompt != null);
		return [];
	}
	const originalCharacterState = result.originalState.characters.get(player.id);
	AssertNotNullable(originalCharacterState);
	const resultCharacterState = result.resultState.characters.get(player.id);
	AssertNotNullable(resultCharacterState);

	const originalRestrictionManager = player.getRestrictionManager(originalCharacterState, spaceContext);
	const resultRestrictionManager = player.getRestrictionManager(resultCharacterState, spaceContext);

	const warnings: string[] = [];

	// Warn if player won't be able to use hands after this action
	if (
		originalRestrictionManager.canUseHands() &&
		!resultRestrictionManager.forceAllowItemActions() &&
		!resultRestrictionManager.canUseHands()
	) {
		warnings.push(`This action will prevent you from using your hands`);
	}

	if (action.type === 'roomDeviceDeploy' && !action.deployment.deployed) {
		const originalDeviceState = EvalItemPath(result.originalState.getItems(action.target) ?? [], action.item);
		if (
			originalDeviceState != null &&
			originalDeviceState.isType('roomDevice') &&
			originalDeviceState.deployment.deployed &&
			originalDeviceState.slotOccupancy.size > 0
		) {
			warnings.push(`Storing an occupied room device will remove all characters from it`);
		}
	}

	return warnings;
}
