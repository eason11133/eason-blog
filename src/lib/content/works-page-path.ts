export interface WorkPageUrls {
	current: string;
	prev: string | undefined;
	next: string | undefined;
}

function assertPageNumber(page: number, name: string) {
	if (!Number.isInteger(page) || page < 1) {
		throw new RangeError(`${name} must be a positive integer`);
	}
}

export function getWorkPagePath(page: number): string {
	assertPageNumber(page, 'page');
	return page === 1 ? '/experience/' : `/experience/page/${page}/`;
}

export function getWorkPageParam(page: number): string | undefined {
	assertPageNumber(page, 'page');
	return page === 1 ? undefined : `page/${page}`;
}

export function getWorkPageUrls(currentPage: number, lastPage: number): WorkPageUrls {
	assertPageNumber(currentPage, 'currentPage');
	assertPageNumber(lastPage, 'lastPage');
	if (currentPage > lastPage) throw new RangeError('currentPage cannot exceed lastPage');

	return {
		current: getWorkPagePath(currentPage),
		prev: currentPage > 1 ? getWorkPagePath(currentPage - 1) : undefined,
		next: currentPage < lastPage ? getWorkPagePath(currentPage + 1) : undefined,
	};
}
