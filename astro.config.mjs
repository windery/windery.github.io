import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightLinksValidator from 'starlight-links-validator';
import starlightGiscus from 'starlight-giscus';

// 项目深读：目录名 → 侧栏显示的仓库名
const projects = [
	['impeccable', 'pbakaus/impeccable'],
	['windery-agent-to-feishu', 'windery/agent-to-feishu'],
	['mattpocock-skills', 'mattpocock/skills'],
	['harry0703-moneyprinterturbo', 'harry0703/MoneyPrinterTurbo'],
	['debpalash-voicestudio', 'debpalash/VoiceStudio'],
	['vectorize-io-hindsight', 'vectorize-io/hindsight'],
	['paperclipai-paperclip', 'paperclipai/paperclip'],
];

export default defineConfig({
	site: 'https://windery.github.io',
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: 'Windery',
			defaultLocale: 'root',
			locales: { root: { label: '简体中文', lang: 'zh-CN' } },
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/windery' }],
			components: { PageTitle: './src/components/PageTitle.astro' },
			plugins: [
				starlightSidebarTopics(
					[
						{ label: 'AI 快讯', link: '/news/', icon: 'rocket', items: ['news'] },
						{ label: 'AI 工具箱', link: '/tools/', icon: 'puzzle', items: ['tools'] },
						{ label: 'AI 实践', link: '/practice/', icon: 'pencil', items: ['practice'] },
						{
							label: '项目深读',
							link: '/projects/',
							icon: 'github',
							items: [
								{ label: '全部项目', link: '/projects/' },
								...projects.map(([dir, label]) => ({
									label,
									collapsed: true,
									items: [{ autogenerate: { directory: `projects/${dir}` } }],
								})),
							],
						},
						// 课程按 <课>/<章>/<节> 目录自动生成多级侧栏
						{ label: '系统课程', link: '/courses/', icon: 'open-book', items: [{ autogenerate: { directory: 'courses' } }] },
					],
					{ exclude: ['/'] },
				),
				starlightLinksValidator(),
				// 评论存在本仓库 Discussions 的 Announcements 分类：只有维护者和 giscus 能新建讨论
				starlightGiscus({
					repo: 'windery/windery.github.io',
					repoId: 'R_kgDOUzRbBw',
					category: 'Announcements',
					categoryId: 'DIC_kwDOUzRbB84DJVSY',
					lazy: true,
				}),
			],
		}),
	],
});
