<script lang="ts">
        import { page } from '$app/stores';

        type Props = {
                title: string;
                description: string;
                path?: string;
                image?: string;
                type?: 'website' | 'article';
        };

        const SITE_NAME = 'Peer Connect';
        const DEFAULT_IMAGE = '/images/og-default.svg';

        let { title, description, path, image = DEFAULT_IMAGE, type = 'website' }: Props = $props();

        const canonicalUrl = $derived(`${$page.url.origin}${path ?? $page.url.pathname}`);
        const resolvedImage = $derived(image.startsWith('http') ? image : `${$page.url.origin}${image}`);
</script>

<svelte:head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={resolvedImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={resolvedImage} />
</svelte:head>
