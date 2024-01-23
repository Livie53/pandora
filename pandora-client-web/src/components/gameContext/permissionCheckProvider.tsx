import React, { ReactElement, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChildrenProps } from '../../common/reactTypes';
import { AppearanceActionProblem, AssertNever, AssertNotNullable, GameLogicPermission, GetLogger, Logger, PermissionRestriction, PermissionType, TypedEventEmitter } from 'pandora-common';
import { useShardChangeListener, useShardConnector } from './shardConnectorContextProvider';
import { ShardConnector } from '../../networking/shardConnector';
import { PermissionPromptHandler } from '../settings/permissionsSettings';

export class PermissionCheckServiceBase extends TypedEventEmitter<{
	permissionResultReset: void;
	permissionResultUpdated: GameLogicPermission;
}> {
	public checkPermissions(_permissions: ReadonlySet<GameLogicPermission>): readonly PermissionRestriction[] {
		return [];
	}

	public onPermissionsChanged() {
		// no-op
	}
}

class PermissionCheckService extends PermissionCheckServiceBase {
	private _logger: Logger;
	private _shardConnector: ShardConnector;

	private _permissionsGeneration = 1;
	private readonly _pendingChecks = new Set<GameLogicPermission>();
	private readonly _cachedResults = new Map<GameLogicPermission, PermissionType>();

	constructor(shardConnector: ShardConnector) {
		super();
		this._logger = GetLogger('PermissionCheckService');
		this._shardConnector = shardConnector;
	}

	public override checkPermissions(permissions: ReadonlySet<GameLogicPermission>): readonly PermissionRestriction[] {
		const generation = this._permissionsGeneration;

		const restrictions: PermissionRestriction[] = [];

		for (const permission of permissions) {
			const cachedResult = this._cachedResults.get(permission);
			if (cachedResult != null) {
				if (cachedResult !== 'yes') {
					restrictions.push(permission.getRestrictionDescriptor(cachedResult));
				}
				continue;
			}

			if (this._pendingChecks.has(permission))
				continue;

			this._pendingChecks.add(permission);
			this._shardConnector.awaitResponse('permissionCheck', {
				target: permission.character.id,
				permissionGroup: permission.group,
				permissionId: permission.id,
			})
				.then((result) => {
					if (this._permissionsGeneration !== generation)
						return;
					this._pendingChecks.delete(permission);

					switch (result.result) {
						case 'ok':
							this._cachedResults.set(permission, result.permission);
							this.emit('permissionResultUpdated', permission);
							break;
						case 'notFound':
							this._logger.warning(`Permission check for permission ${permission.character.id}:${permission.group}:${permission.id} failed: Server returned 'notFound'`);
							break;
						default:
							AssertNever(result);
					}
				}, (error) => {
					if (this._permissionsGeneration !== generation)
						return;
					this._pendingChecks.delete(permission);

					this._logger.warning(`Permission check for permission ${permission.character.id}:${permission.group}:${permission.id} failed:`, error);
				});
		}

		return restrictions;
	}

	public override onPermissionsChanged() {
		this._permissionsGeneration++;
		this._pendingChecks.clear();
		this._cachedResults.clear();
		this.emit('permissionResultReset', undefined);
	}
}

export const permissionCheckContext = createContext<PermissionCheckServiceBase | null | undefined>(undefined);

export function PermissionCheckServiceProvider({ children }: ChildrenProps): ReactElement {
	const shardConnector = useShardConnector();
	const service = useMemo(() => shardConnector != null ? new PermissionCheckService(shardConnector) : null, [shardConnector]);

	useShardChangeListener('permissions', () => {
		service?.onPermissionsChanged();
	}, false);

	return (
		<permissionCheckContext.Provider value={ service }>
			<PermissionPromptHandler />
			{ children }
		</permissionCheckContext.Provider>
	);
}

function usePermissionCheckService(): PermissionCheckServiceBase {
	const service = useContext(permissionCheckContext);
	AssertNotNullable(service);
	return service;
}

export function usePermissionCheck(permissions: ReadonlySet<GameLogicPermission> | undefined): readonly AppearanceActionProblem[] {
	const service = usePermissionCheckService();

	const [resultProblems, setResultProblems] = useState<readonly AppearanceActionProblem[]>([]);

	const runChecks = useCallback(() => {
		if (permissions == null)
			return;

		setResultProblems(
			service.checkPermissions(permissions).map((restriction) => ({
				result: 'restrictionError',
				restriction,
			})),
		);
	}, [permissions, service]);

	useEffect(() => {
		if (!permissions)
			return undefined;

		const cleanup: (() => void)[] = [];

		cleanup.push(
			service.on('permissionResultReset', () => {
				runChecks();
			}),
		);
		cleanup.push(
			service.on('permissionResultUpdated', (updatedPermission) => {
				if (permissions.has(updatedPermission)) {
					runChecks();
				}
			}),
		);
		runChecks();

		return () => {
			cleanup.forEach((c) => c());
		};
	}, [permissions, runChecks, service]);

	return resultProblems;
}
