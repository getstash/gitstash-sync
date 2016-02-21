import rimraf from 'rimraf';
import log from 'cuvva-log';
import {Clone, Repository, Remote, Reference} from 'nodegit';
import fs from 'fs';

export default class Sync {
	constructor(api, github, githubAuth) {
		this.api = api;
		this.github = github;
		this.githubAuth = githubAuth;

		this.completeCheck().catch(e => log.fatal(e));
	}

	async completeCheck() {
		const repos = await this.api('get', 'repositories');

		for (const repo of repos)
			await this.updateRepo(repo);

		setTimeout(() => {
			this.completeCheck();
		}, 3 * 60 * 60 * 1000); // 3 hours
	}

	async updateRepo(repo) {
		let status = 'syncing';

		await this.api('put', `repositories/${repo.id}`, null, { status });

		try {
			const path = `repositories/${repo.github_id}`;
			const githubRepo = await this.github('get', path, this.githubAuth);

			repo.gitUrl = githubRepo.git_url;

			status = await syncRepo(repo);
		} catch (error) {
			log.warn('repo_update_failed', [error], { repo });
			status = 'error';
		}

		await this.api('put', `repositories/${repo.id}`, null, { status });
	}
}

async function syncRepo(repo) {
	if (repo.enabled) {
		const gitRepo = await getRepo(repo.id, repo.gitUrl);

		Remote.setUrl(gitRepo, 'origin', repo.gitUrl);

		await gitRepo.fetch('origin', {
			downloadTags: 1,
			prune: 1,
			updateFetchhead: 1,
		});

		await repoUpdateServerInfo(repo.id);

		return 'synced';
	} else {
		await deleteRepo(repo.id);
		return 'deleted';
	}
}

async function repoUpdateServerInfo(repoId) {
	// re-implementation of `git update-server-info`

	const path = `repos/${repoId}`;

	// open the repo as a bare repo
	// look through the refs and generate
	// /info/refs

	const repo = await Repository.openBare(path);
	const refs = await Reference.list(repo);

	let file = ""

	for (const ref of refs) {
		const oid = await Reference.nameToId(repo, ref);

		file += `${oid.tostrS()}\t${ref}\n`;
	}

	fs.writeFileSync(`${path}/info/refs`, file);

	// now generate
	// /objects/info/packs

	const files = fs.readdirSync(`${path}/objects/pack/`);

	let packFile = "";

	for (const file of files) {
		if (file.endsWith('.pack')) {
			packFile += `P ${file}\n`;
		}
	}

	fs.writeFileSync(`${path}/objects/info/packs`, packFile);
}

async function getRepo(repoId, url) {
	const path = `repos/${repoId}`;

	try {
		return await Repository.openBare(path);
	} catch (error) {
		log.debug('repo_open_failed', [error], { repoId });

		return await Clone.clone(url, path, {
			bare: 1,
		});
	}
}

async function deleteRepo(repoId) {
	const path = `repos/${repoId}`;

	await new Promise((resolve, reject) => {
		rimraf(path, error => {
			if (error)
				reject(error);
			else
				resolve();
		});
	});
}
