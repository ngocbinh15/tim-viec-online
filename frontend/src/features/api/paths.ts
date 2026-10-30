const publicReads =
  /^\/(?:categories(?:\/\d+)?|skills(?:\/\d+)?|companies(?:\/\d+)?|jobs(?:\/\d+)?|locations\/cities)$/;
const routes: [RegExp, string[]][] = [
  [publicReads, ["GET"]],
  [/^\/user\/email-preferences$/, ["GET", "PUT"]],
  [/^\/candidate\/profile$/, ["GET", "POST", "PUT"]],
  [/^\/candidate\/cv$/, ["GET", "POST", "DELETE"]],
  [/^\/candidate\/cv\/file$/, ["GET"]],
  [/^\/candidate\/resume-templates$/, ["GET"]],
  [/^\/candidate\/resumes$/, ["GET", "POST"]],
  [/^\/candidate\/resumes\/[1-9]\d*$/, ["GET", "PUT", "DELETE"]],
  [/^\/candidate\/resumes\/[1-9]\d*\/(?:duplicate|assets|exports)$/, ["POST"]],
  [/^\/candidate\/resumes\/[1-9]\d*\/assets\/[1-9]\d*$/, ["GET"]],
  [/^\/candidate\/resume-exports\/[1-9]\d*(?:\/file)?$/, ["GET"]],
  [/^\/candidate\/avatar$/, ["POST", "DELETE"]],
  [/^\/candidate\/(?:saved-jobs|applications)$/, ["GET"]],
  [/^\/candidate\/applications\/\d+\/withdraw$/, ["DELETE"]],
  [/^\/jobs\/\d+\/(?:apply|report)$/, ["POST"]],
  [/^\/jobs\/\d+\/save$/, ["POST", "DELETE"]],
  [/^\/applications\/\d+\/cv$/, ["GET"]],
  [/^\/applications\/[1-9]\d*\/ai-analysis$/, ["GET"]],
  [/^\/applications\/[1-9]\d*\/ai-analyze$/, ["POST"]],
  [/^\/employer\/company$/, ["GET", "POST"]],
  [/^\/employer\/(?:my-jobs|applications)$/, ["GET"]],
  [/^\/employer\/applications\/export$/, ["POST"]],
  [/^\/employer\/jobs$/, ["POST"]],
  [/^\/employer\/jobs\/\d+$/, ["PUT"]],
  [/^\/employer\/jobs\/\d+\/status$/, ["PATCH"]],
  [/^\/employer\/jobs\/\d+\/applications$/, ["GET"]],
  [/^\/employer\/applications\/\d+$/, ["GET"]],
  [/^\/employer\/applications\/\d+\/status$/, ["PATCH"]],
  [/^\/conversations$/, ["GET", "POST"]],
  [/^\/conversations\/\d+\/messages$/, ["GET", "POST"]],
  [/^\/conversations\/\d+\/messages\/\d+\/image$/, ["GET"]],
  [/^\/conversations\/\d+\/read$/, ["PATCH"]],
  [/^\/notifications$/, ["GET"]],
  [/^\/notifications\/(?:\d+\/read|read-all)$/, ["PATCH"]],
  [/^\/notifications\/\d+$/, ["DELETE"]],
  [/^\/admin\/stats$/, ["GET"]],
  [/^\/admin\/users(?:\/\d+)?$/, ["GET"]],
  [/^\/admin\/users\/\d+\/(?:status|toggle-lock)$/, ["PATCH"]],
  [/^\/admin\/jobs(?:\/(?:\d+|reported))?$/, ["GET"]],
  [/^\/admin\/jobs\/[1-9]\d*\/applications$/, ["GET"]],
  [/^\/admin\/applications\/[1-9]\d*$/, ["GET"]],
  [/^\/admin\/jobs\/\d+$/, ["DELETE"]],
  [/^\/admin\/jobs\/\d+\/report$/, ["PATCH"]],
  [/^\/admin\/(?:categories|skills)$/, ["GET", "POST"]],
  [/^\/admin\/(?:categories|skills)\/\d+$/, ["PUT", "DELETE"]],
  [/^\/broadcasting\/auth$/, ["POST"]],
  [/^\/workspace\/bootstrap$/, ["GET"]],
];

export function allowedBackendPath(path: string, method = "GET"): boolean {
  if (path.length > 6000 || /[\\#\x00-\x20]/.test(path)) return false;
  const [pathname] = path.split("?");
  return routes.some(
    ([pattern, methods]) => pattern.test(pathname) && methods.includes(method),
  );
}

export const isPublicBackendRead = (path: string) =>
  publicReads.test(path.split("?")[0]);

// Job detail reads count a view; leave them uncached. All private workspace
// reads must always use the current session and bypass shared directory data.
export const cacheablePublicRead = (path: string, method = "GET") =>
  method === "GET" &&
  allowedBackendPath(path, method) &&
  isPublicBackendRead(path) &&
  !/^\/jobs\/\d+$/.test(path.split("?")[0]);

export const invalidatesPublicDirectory = (path: string, method: string) =>
  !["GET", "HEAD"].includes(method) &&
  /^\/(?:employer\/(?:company|jobs(?:\/\d+(?:\/status)?)?)|jobs\/\d+\/apply|admin\/(?:jobs(?:\/\d+(?:\/report)?)?|users\/\d+\/(?:status|toggle-lock)|(?:categories|skills)(?:\/\d+)?))$/.test(
    path.split("?")[0],
  );

export const protectedFilePath = (path: string) =>
  /^\/(?:employer\/applications\/export|candidate\/cv\/file|candidate\/resumes\/[1-9]\d*\/assets\/[1-9]\d*|candidate\/resume-exports\/[1-9]\d*\/file|applications\/\d+\/cv|conversations\/\d+\/messages\/\d+\/image)$/.test(
    path.split("?")[0],
  );
