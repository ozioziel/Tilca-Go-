import { Capacitor } from '@capacitor/core'

/** true dentro de la app nativa (Android / iOS con Capacitor). */
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'
