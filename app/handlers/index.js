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
