import type { Immutable } from 'immer';
import { sortBy } from 'lodash';
import type { AssetFrameworkCharacterState, AssetFrameworkGlobalState, CharacterActionAttempt, ICharacterRoomData } from 'pandora-common';
import React, { useMemo, type ReactElement } from 'react';
import type { Character } from '../../../character/character';
import { Column, Row } from '../../../components/common/container/container';
import { useGlobalState, type GameState } from '../../../components/gameContext/gameStateContextProvider';
import { ActionAttemptCancelButton, ActionAttemptConfirmButton, ActionAttemptInterruptButton } from '../../../components/wardrobe/views/wardrobeActionAttempt';
import { useObservable } from '../../../observable';
import { ActionMessageElement } from './chat';
import { DescribeGameLogicAction } from './chatMessagesDescriptions';

interface ChatInjectedMessageDescriptor {
	time: number;
	element: ReactElement;
}

export function useChatInjectedMessages(gameState: GameState): readonly ChatInjectedMessageDescriptor[] {
	const currentState = useGlobalState(gameState);
	const characters = useObservable(gameState.characters);

	return useMemo((): readonly ChatInjectedMessageDescriptor[] => {
		const result: ChatInjectedMessageDescriptor[] = [];

		// Struggling messages
		for (const character of characters) {
			const characterState = currentState.getCharacterState(character.id);
			if (characterState?.attemptingAction != null) {
				result.push(MessageForAttemptedAction(character, characterState, currentState, characterState.attemptingAction));
			}
		}

		return sortBy(result, (m) => m.time);
	}, [currentState, characters]);
}

function MessageForAttemptedAction(
	character: Character<ICharacterRoomData>,
	characterState: AssetFrameworkCharacterState,
	globalState: AssetFrameworkGlobalState,
	action: Immutable<CharacterActionAttempt>,
): ChatInjectedMessageDescriptor {
	return {
		time: action.start,
		element: (
			<ActionMessageElement
				key={ `actionAttempt-${character.id}-${action.start}` }
				type='serverMessage'
				messageTime={ action.start }
				edited={ false }
				extraContent={
					<Column>
						<span>
							{ character.isPlayer() ? 'You are' : `${ character.data.name } (${ character.id }) is` } attempting to:&#32;
							<DescribeGameLogicAction
								action={ action.action }
								actionOriginator={ character }
								globalState={ globalState }
							/>
						</span>
						{
							character.isPlayer() ? (
								<Row padding='medium'>
									<ActionAttemptCancelButton attemptingAction={ action } />
									<ActionAttemptConfirmButton attemptingAction={ action } />
								</Row>
							) : (
								<Row padding='medium'>
									<ActionAttemptInterruptButton characterState={ characterState } attemptingAction={ action } />
								</Row>
							)
						}
					</Column>
				}
				defaultUnfolded
			>
				{ character.isPlayer() ? 'You are' : `${ character.data.name } (${ character.id }) is` } attempting an action.
			</ActionMessageElement>
		),
	};
}
