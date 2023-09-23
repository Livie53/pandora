import {
	AppearanceAction,
	AppearanceActionContext,
	AppearanceActionFailure,
	AppearanceActionResult,
	AssertNever,
	AssertNotNullable,
	EMPTY_ARRAY,
	IClientShardNormalResult,
	Nullable,
	RoomInventory,
	RoomTargetSelector,
} from 'pandora-common';
import React, { createContext, ReactElement, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAssetManager } from '../../assets/assetManager';
import { ICharacter } from '../../character/character';
import { Observable } from '../../observable';
import { useShardConnector } from '../gameContext/shardConnectorContextProvider';
import { useActionRoomContext, useChatRoomCharacters, useChatroomRequired, useRoomState } from '../gameContext/chatRoomContextProvider';
import type { PlayerCharacter } from '../../character/player';
import { EvalItemPath } from 'pandora-common/dist/assets/appearanceHelpers';
import { useCurrentAccount } from '../gameContext/directoryConnectorContextProvider';
import { WardrobeContext, WardrobeContextExtraItemActionComponent, WardrobeHeldItem, WardrobeTarget } from './wardrobeTypes';
import { useAsyncEvent } from '../../common/useEvent';

export const wardrobeContext = createContext<WardrobeContext | null>(null);

export function WardrobeContextProvider({ target, player, children }: { target: WardrobeTarget; player: PlayerCharacter; children: ReactNode; }): ReactElement {
	const account = useCurrentAccount();
	const assetList = useAssetManager().assetList;
	const room = useChatroomRequired();
	const globalStateContainer = room.globalState;
	const roomContext = useActionRoomContext();
	const shardConnector = useShardConnector();
	const chatroomCharacters: readonly ICharacter[] = useChatRoomCharacters() ?? EMPTY_ARRAY;

	AssertNotNullable(account);

	const extraItemActions = useMemo(() => new Observable<readonly WardrobeContextExtraItemActionComponent[]>([]), []);
	const [heldItem, setHeldItem] = useState<WardrobeHeldItem>({ type: 'nothing' });

	const actions = useMemo<AppearanceActionContext>(() => ({
		player: player.data.id,
		globalState: globalStateContainer,
		getCharacter: (id) => {
			const state = globalStateContainer.currentState.getCharacterState(id);
			const character = chatroomCharacters.find((c) => c.id === id);
			if (!state || !character)
				return null;

			return character.getRestrictionManager(state, roomContext);
		},
		getTarget: (actionTarget) => {
			if (actionTarget.type === 'character') {
				const state = globalStateContainer.currentState.getCharacterState(actionTarget.characterId);
				const character = chatroomCharacters.find((c) => c.id === actionTarget.characterId);
				if (!state || !character)
					return null;

				return character.getAppearance(state);
			}

			if (actionTarget.type === 'roomInventory') {
				const roomState = globalStateContainer.currentState.room;
				if (!roomState)
					return null;

				return new RoomInventory(roomState);
			}

			AssertNever(actionTarget);
		},
	}), [player, globalStateContainer, roomContext, chatroomCharacters]);

	const targetSelector = useMemo<RoomTargetSelector>(() => {
		if (target.type === 'character') {
			return {
				type: 'character',
				characterId: target.id,
			};
		} else if (target.type === 'room') {
			return {
				type: 'roomInventory',
			};
		}
		AssertNever(target);
	}, [target]);

	const globalState = useRoomState(room);

	useEffect(() => {
		if (heldItem.type === 'item') {
			const rootItems = globalState.getItems(heldItem.target);
			const item = EvalItemPath(rootItems ?? EMPTY_ARRAY, heldItem.path);
			if (!item) {
				setHeldItem({ type: 'nothing' });
			}
		}
	}, [heldItem, globalState]);

	const context = useMemo<WardrobeContext>(() => ({
		target,
		targetSelector,
		player,
		globalState,
		assetList,
		heldItem,
		setHeldItem,
		extraItemActions,
		actions,
		execute: (action) => shardConnector?.awaitResponse('appearanceAction', action),
		showExtraActionButtons: account.settings.wardrobeExtraActionButtons,
	}), [target, targetSelector, player, globalState, assetList, heldItem, extraItemActions, actions, shardConnector, account.settings]);

	return (
		<wardrobeContext.Provider value={ context }>
			{ children }
		</wardrobeContext.Provider>
	);
}

export function useWardrobeContext(): Readonly<WardrobeContext> {
	const ctx = useContext(wardrobeContext);
	AssertNotNullable(ctx);
	return ctx;
}

type ExecuteCallbackOptions = {
	onSuccess?: () => void;
	onFailure?: (failure: AppearanceActionFailure) => void;
};

export function useWardrobeExecute(action: Nullable<AppearanceAction>, props: ExecuteCallbackOptions = {}) {
	const { execute } = useWardrobeContext();
	return useAsyncEvent(async () => {
		if (action)
			return await execute(action);

		return null;
	}, ExecuteCallback(props));
}

export function useWardrobeExecuteChecked(action: Nullable<AppearanceAction>, result?: AppearanceActionResult | null, props: ExecuteCallbackOptions = {}) {
	const { execute } = useWardrobeContext();
	return useAsyncEvent(async () => {
		if (action && result?.result === 'success')
			return await execute(action);

		return null;
	}, ExecuteCallback(props));
}

export function useWardrobeExecuteCallback(props: ExecuteCallbackOptions = {}) {
	const { execute } = useWardrobeContext();
	return useAsyncEvent(async (action: AppearanceAction) => await execute(action), ExecuteCallback(props));
}

function ExecuteCallback({ onSuccess, onFailure }: ExecuteCallbackOptions) {
	return (r: Nullable<IClientShardNormalResult['appearanceAction']>) => {
		switch (r?.result) {
			case 'success':
				onSuccess?.();
				break;
			case 'failure':
				onFailure?.(r.failure);
				break;
		}
	};
}
