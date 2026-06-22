import {describe, expect, it} from 'vitest'
import {base64UrlFromString, buildJwtClaims, parseServiceAccountKey, pemToArrayBuffer} from '@/services/googleServiceAccount'

describe('services/googleServiceAccount', () => {
    describe('base64UrlFromString', () => {
        it('encode en base64url sans padding ni + /', () => {
            const out = base64UrlFromString('{"a":">>>"}')
            expect(out).not.toMatch(/[+/=]/)
            // round-trip via atob (en remettant le padding)
            const b64 = out.replace(/-/g, '+').replace(/_/g, '/')
            expect(atob(b64 + '==='.slice((b64.length + 3) % 4))).toBe('{"a":">>>"}')
        })
    })

    describe('parseServiceAccountKey', () => {
        const valid = {
            type: 'service_account',
            client_email: 'svc@projet.iam.gserviceaccount.com',
            private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n'
        }

        it('accepte une clé valide (objet ou chaîne) et applique le token_uri par défaut', () => {
            const fromObj = parseServiceAccountKey(valid)
            expect(fromObj.client_email).toBe(valid.client_email)
            expect(fromObj.token_uri).toBe('https://oauth2.googleapis.com/token')
            const fromStr = parseServiceAccountKey(JSON.stringify(valid))
            expect(fromStr.client_email).toBe(valid.client_email)
        })

        it('conserve un token_uri explicite', () => {
            const out = parseServiceAccountKey({...valid, token_uri: 'https://example/token'})
            expect(out.token_uri).toBe('https://example/token')
        })

        it('rejette un JSON illisible', () => {
            expect(() => parseServiceAccountKey('{pas du json')).toThrow(/illisible|invalide/i)
        })

        it('rejette un type incorrect', () => {
            expect(() => parseServiceAccountKey({type: 'authorized_user', client_email: 'x', private_key: 'y'}))
                .toThrow(/compte de service/i)
        })

        it('rejette une clé incomplète', () => {
            expect(() => parseServiceAccountKey({type: 'service_account', client_email: 'x'}))
                .toThrow(/private_key|incompl/i)
        })
    })

    describe('buildJwtClaims', () => {
        it('construit iss/scope/aud/iat/exp (exp = iat + 1h)', () => {
            const key = {client_email: 'svc@x.iam.gserviceaccount.com', token_uri: 'https://oauth2.googleapis.com/token'}
            const claims = buildJwtClaims(key, 'https://www.googleapis.com/auth/webmasters.readonly', 1000)
            expect(claims).toEqual({
                iss: 'svc@x.iam.gserviceaccount.com',
                scope: 'https://www.googleapis.com/auth/webmasters.readonly',
                aud: 'https://oauth2.googleapis.com/token',
                iat: 1000,
                exp: 4600
            })
        })
    })

    describe('pemToArrayBuffer', () => {
        it('décode un PEM PKCS#8 en octets DER', () => {
            // "TEST" -> base64 "VEVTVA=="
            const pem = '-----BEGIN PRIVATE KEY-----\nVEVTVA==\n-----END PRIVATE KEY-----'
            const buf = pemToArrayBuffer(pem)
            expect(new TextDecoder().decode(buf)).toBe('TEST')
        })
    })
})
