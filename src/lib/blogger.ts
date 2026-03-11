// Blogger API v3 Client
// Reference: https://developers.google.com/blogger/docs/3.0/reference

const BLOGGER_API_BASE = "https://www.googleapis.com/blogger/v3";

export interface BloggerBlog {
    id: string;
    name: string;
    description?: string;
    url: string;
    selfLink: string;
    posts: { totalItems: number };
    pages: { totalItems: number };
    locale: { language: string; country: string };
}

export interface BloggerPost {
    kind?: string;
    id?: string;
    blog?: { id: string };
    published?: string;
    updated?: string;
    url?: string;
    selfLink?: string;
    title: string;
    titleLink?: string;
    content: string;
    author?: {
        id: string;
        displayName: string;
        url: string;
        image: { url: string };
    };
    replies?: { totalItems: number };
    labels?: string[];
    status?: string;
    images?: { url: string }[];
}

export interface BloggerPostInput {
    title: string;
    content: string;
    labels?: string[];
    isDraft?: boolean;
}

async function bloggerFetch<T>(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${BLOGGER_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        // A 404 on listBlogs means the user literally has 0 blogs created on Blogger.com
        if (res.status === 404 && endpoint.includes("/users/self/blogs")) {
            return { items: [] } as any;
        }

        const error = await res.text();
        throw new Error(`Blogger API error (${res.status}): ${error}`);
    }

    return res.json();
}

// List all blogs for the authenticated user
export async function listBlogs(
    accessToken: string
): Promise<BloggerBlog[]> {
    const data = await bloggerFetch<{ items: BloggerBlog[] }>(
        "/users/self/blogs",
        accessToken
    );
    return data.items || [];
}

// Get a single blog by ID
export async function getBlog(
    blogId: string,
    accessToken: string
): Promise<BloggerBlog> {
    return bloggerFetch<BloggerBlog>(`/blogs/${blogId}`, accessToken);
}

// List posts for a blog
export async function listPosts(
    blogId: string,
    accessToken: string,
    maxResults = 20,
    pageToken?: string
): Promise<{ items: BloggerPost[]; nextPageToken?: string }> {
    const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        status: "live",
    });
    if (pageToken) params.set("pageToken", pageToken);

    return bloggerFetch(
        `/blogs/${blogId}/posts?${params.toString()}`,
        accessToken
    );
}

// Search posts in a blog
export async function searchPosts(
    blogId: string,
    query: string,
    accessToken: string
): Promise<{ items: BloggerPost[] }> {
    const params = new URLSearchParams({ q: query });
    return bloggerFetch(
        `/blogs/${blogId}/posts/search?${params.toString()}`,
        accessToken
    );
}

// Create a new post
export async function createPost(
    blogId: string,
    post: BloggerPostInput,
    accessToken: string
): Promise<BloggerPost> {
    const params = new URLSearchParams();
    if (post.isDraft) params.set("isDraft", "true");

    const body: Partial<BloggerPost> = {
        kind: "blogger#post",
        title: post.title,
        content: post.content,
        labels: post.labels,
    };

    return bloggerFetch<BloggerPost>(
        `/blogs/${blogId}/posts?${params.toString()}`,
        accessToken,
        {
            method: "POST",
            body: JSON.stringify(body),
        }
    );
}

// Update an existing post
export async function updatePost(
    blogId: string,
    postId: string,
    post: Partial<BloggerPostInput>,
    accessToken: string
): Promise<BloggerPost> {
    const body: Partial<BloggerPost> = {};
    if (post.title) body.title = post.title;
    if (post.content) body.content = post.content;
    if (post.labels) body.labels = post.labels;

    return bloggerFetch<BloggerPost>(
        `/blogs/${blogId}/posts/${postId}`,
        accessToken,
        {
            method: "PUT",
            body: JSON.stringify(body),
        }
    );
}

// Publish a draft post
export async function publishPost(
    blogId: string,
    postId: string,
    accessToken: string
): Promise<BloggerPost> {
    return bloggerFetch<BloggerPost>(
        `/blogs/${blogId}/posts/${postId}/publish`,
        accessToken,
        { method: "POST" }
    );
}

// Revert a published post to draft
export async function revertPost(
    blogId: string,
    postId: string,
    accessToken: string
): Promise<BloggerPost> {
    return bloggerFetch<BloggerPost>(
        `/blogs/${blogId}/posts/${postId}/revert`,
        accessToken,
        { method: "POST" }
    );
}

// Delete a post
export async function deletePost(
    blogId: string,
    postId: string,
    accessToken: string
): Promise<void> {
    await bloggerFetch<void>(
        `/blogs/${blogId}/posts/${postId}`,
        accessToken,
        { method: "DELETE" }
    );
}

// Get a single post
export async function getPost(
    blogId: string,
    postId: string,
    accessToken: string
): Promise<BloggerPost> {
    return bloggerFetch<BloggerPost>(
        `/blogs/${blogId}/posts/${postId}`,
        accessToken
    );
}
