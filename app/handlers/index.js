import Router from 'express-promise-router';

const router = Router();
export default router;

// prefix /
router.post('/github_hook', async (req, res) => {
	const sync = req.app.get('sync');
	const api = req.app.get('api');
	const input = req.body;

	const repo = api('get', `repositories/gh:${input.repository.id}`);

	sync.updateRepo(repo);

	res.sendStatus(204);
});

router.post('/api_hook', async (req, res) => {
	const sync = req.app.get('sync');
	const input = req.body;

	sync.updateRepo(input);

	res.sendStatus(204);
});

router.get('/:user_name/:repo/*', async (req, res) => {
	// get the repo id
	let repo_info = await req.app.get('github')('get', `repos/${req.params.user_name}/${req.params.repo}`, req.app.get('githubAuth'));
	let github_id = repo_info.id;

	console.log(`GitHub Repo ID: ${github_id}`);

	// look for that particular one:

	let our_id = await req.app.get('api')('get', `repositories/gh:${github_id}`);

	console.log(our_id.id);

	// now load the thing from file
	// DANGER: this is very very very insecure... DO NOT RELEASE IN PRODUCTION
	console.log(`${process.cwd()}/repos/${our_id.id}/${req.params[0]}`)
	res.sendFile(`${process.cwd()}/repos/${our_id.id}/${req.params[0]}`)
});


