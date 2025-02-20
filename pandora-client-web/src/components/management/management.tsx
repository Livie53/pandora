import { IsAuthorized } from 'pandora-common';
import { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { useObservable } from '../../observable';
import { useCurrentAccount } from '../../services/accountLogic/accountManagerHooks';
import { Tab, UrlTab, UrlTabContainer } from '../common/tabs/tabs';
import { useDirectoryConnector } from '../gameContext/directoryConnectorContextProvider';
import { BetaKeys } from './betaKeys/betaKeys';
import './management.scss';
import { Roles } from './roles/roles';
import { Shards } from './shards/shards';

export function ManagementRoutes(): ReactElement | null {
	const navigate = useNavigate();
	const directoryConnector = useDirectoryConnector();
	const directoryStatus = useObservable(directoryConnector.directoryStatus);
	const account = useCurrentAccount();
	const isDeveloper = account?.roles !== undefined && IsAuthorized(account.roles, 'developer');
	if (!isDeveloper)
		throw new Error('not authorized');

	return (
		<UrlTabContainer className='flex-1' allowWrap noImplicitDefaultTab>
			<UrlTab name='Shards' urlChunk='shards'>
				<Shards />
			</UrlTab>
			<UrlTab name='Roles' urlChunk='roles'>
				<Roles />
			</UrlTab>
			{
				(directoryStatus.betaKeyRequired) ? (
					<UrlTab name='Beta Keys' urlChunk='beta_keys'>
						<BetaKeys />
					</UrlTab>
				) : null
			}
			<Tab name='◄ Back' tabClassName='slim' onClick={ () => navigate('/') } />
		</UrlTabContainer>
	);
}
