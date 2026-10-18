/** Error con código HTTP y un código estable para el frontend. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (code: string, msg: string) => new HttpError(400, code, msg)
export const unauthorized = (msg = 'Necesitas iniciar sesión') => new HttpError(401, 'unauthorized', msg)
export const forbidden = (msg = 'No tienes permiso para esta acción') => new HttpError(403, 'forbidden', msg)
export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} no existe`)
export const conflict = (code: string, msg: string) => new HttpError(409, code, msg)
