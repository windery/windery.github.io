import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// 项目深读的来源仓库与阅读日期；是否必填由 PageTitle 按路径检查
				source: z.string().url().optional(),
				date: z.coerce.date().optional(),
				// starlight-giscus 读取：false 时本页不显示评论
				giscus: z.boolean().optional(),
			}),
		}),
	}),
};
