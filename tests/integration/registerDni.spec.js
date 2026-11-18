// Pruebas de integración: registro con DNI, consentimientos separados y errores del backend
// (contrato de POST /api/v1/authentication/sign-up tras la auditoría del backend)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { pendingProfessional, createToken } from '../mocks/data.js'
import { openPage, waitFor } from '../helpers.js'

const VALID = { name: 'Lucía Mendoza', dni: '12345678', email: 'lucia@correo.com', password: 'Secreta123', confirm: 'Secreta123' }

// Completa el formulario; "overrides" permite dejar un campo con un valor inválido
async function fill(page, overrides = {}, { terms = true, privacy = true } = {}) {
  const v = { ...VALID, ...overrides }
  await page.find('#name').setValue(v.name)
  await page.find('#dni').setValue(v.dni)
  await page.find('#email').setValue(v.email)
  await page.find('#password').setValue(v.password)
  await page.find('#confirm').setValue(v.confirm)
  if (terms) await page.find('#terms').setValue(true)
  if (privacy) await page.find('#privacy').setValue(true)
}

// Captura las peticiones de registro y responde con "reply" (por defecto 201)
function captureSignUp(reply) {
  const calls = []
  server.use(http.post(API + '/authentication/sign-up', async ({ request }) => {
    const body = await request.json()
    calls.push(body)
    return reply ? reply(body) : HttpResponse.json({ id: 15, fullName: body.fullName, email: body.email, role: body.role, token: createToken() }, { status: 201 })
  }))
  return calls
}

// Texto del mensaje de error bajo un campo (id del <p> asociado)
const fieldError = (page, id) => (page.find(`#${id}`).exists() ? page.find(`#${id}`).text() : '')

async function submit(page) {
  await page.find('form').trigger('submit')
}

describe('RegisterDni', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El backend exige DNI y dos consentimientos; sin ellos el registro responde 400.
   * - ¿Qué hace?: Registra un usuario válido y verifica el payload completo, la navegación al onboarding
   *   y que el DNI y la contraseña NO queden guardados en localStorage/sessionStorage.
   */
  it('userRegistration_shouldSendDniAndConsents_andNotPersistDni', async () => {
    const calls = captureSignUp()
    const { page, router } = await openPage('/register?type=user')

    await fill(page, { dni: '  12345678' })
    await submit(page)

    await waitFor(() => expect(router.currentRoute.value.name).toBe('OnboardingWelcome'))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      fullName: 'Lucía Mendoza', dni: '12345678', email: 'lucia@correo.com', password: 'Secreta123',
      confirmPassword: 'Secreta123', role: 'USER', acceptedTerms: true, acceptedPrivacyPolicy: true
    })
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(stored).not.toContain('12345678')
    expect(stored).not.toContain('Secreta123')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El consentimiento debe ser libre: ninguna casilla puede venir marcada.
   * - ¿Qué hace?: Abre el formulario y comprueba que ambas casillas están desmarcadas y son independientes.
   */
  it('consentCheckboxes_shouldBeUncheckedOnLoad', async () => {
    const { page } = await openPage('/register?type=user')
    expect(page.find('#terms').element.checked).toBe(false)
    expect(page.find('#privacy').element.checked).toBe(false)
    await page.find('#terms').setValue(true)
    expect(page.find('#privacy').element.checked).toBe(false)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Cada consentimiento es obligatorio por separado.
   * - ¿Qué hace?: Sin Privacidad → error solo en Privacidad; sin Términos → error solo en Términos. No se envía nada.
   */
  it('missingSingleConsent_shouldShowItsOwnError', async () => {
    const calls = captureSignUp()
    const { page } = await openPage('/register?type=user')

    await fill(page, {}, { terms: true, privacy: false })
    await submit(page)
    expect(fieldError(page, 'privacy-error')).toBe('Debes aceptar la Política de Privacidad.')
    expect(fieldError(page, 'terms-error')).toBe('')

    await page.find('#privacy').setValue(true)
    await page.find('#terms').setValue(false)
    await submit(page)
    expect(fieldError(page, 'terms-error')).toBe('Debes aceptar los Términos y Condiciones.')
    expect(fieldError(page, 'privacy-error')).toBe('')
    expect(calls).toHaveLength(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El DNI debe tener exactamente 8 dígitos 0-9.
   * - ¿Qué hace?: Prueba vacío, 7 dígitos, 9 dígitos, letras, símbolos y espacio interno. El campo descarta todo
   *   lo que no sea 0-9 (también lo pegado) y limita a 8; los casos incompletos muestran el mensaje del backend.
   */
  it.each([
    ['vacío', '', '', 'El DNI es obligatorio.'],
    ['7 dígitos', '1234567', '1234567', 'El DNI debe tener exactamente 8 dígitos numéricos.'],
    ['9 dígitos', '123456789', '12345678', ''],
    ['letras', 'ABCDEFGH', '', 'El DNI es obligatorio.'],
    ['letras y dígitos', '1234567A', '1234567', 'El DNI debe tener exactamente 8 dígitos numéricos.'],
    ['símbolos', '1234-567', '1234567', 'El DNI debe tener exactamente 8 dígitos numéricos.'],
    ['espacio interno', '1234 567', '1234567', 'El DNI debe tener exactamente 8 dígitos numéricos.']
  ])('dni %s → valor "%s" filtrado a "%s"', async (_case, typed, expectedValue, expectedError) => {
    const calls = captureSignUp()
    const { page } = await openPage('/register?type=user')

    await fill(page, { dni: typed })
    await submit(page)

    expect(page.find('#dni').element.value).toBe(expectedValue)
    expect(fieldError(page, 'dni-msg')).toBe(expectedError || 'Solo números: exactamente 8 dígitos, sin espacios.')
    if (expectedError) expect(calls).toHaveLength(0)
    else await waitFor(() => expect(calls[0].dni).toBe('12345678'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El DNI tiene validación en tiempo real (sin esperar al envío).
   * - ¿Qué hace?: Escribe 5 dígitos y sale del campo → error; completa 8 → el error desaparece.
   */
  it('dni_shouldValidateInRealTime', async () => {
    const { page } = await openPage('/register?type=user')
    await page.find('#dni').setValue('12345')
    await page.find('#dni').trigger('blur')
    expect(fieldError(page, 'dni-msg')).toBe('El DNI debe tener exactamente 8 dígitos numéricos.')
    await page.find('#dni').setValue('12345678')
    expect(fieldError(page, 'dni-msg')).toBe('Solo números: exactamente 8 dígitos, sin espacios.')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El nombre sigue las reglas del backend: 2 palabras, solo letras, espacios, ' ’ - .
   * - ¿Qué hace?: Rechaza vacío, una palabra, números y símbolos; acepta tildes, ñ, guion y apóstrofo.
   */
  it.each([
    ['', 'Ingresa tu nombre y apellido.'],
    ['Lucía', 'Ingresa tu nombre y apellido.'],
    ['Lucía Mendoza 2', 'El nombre solo puede contener letras, espacios, apóstrofos, guiones y puntos.'],
    ['Lucía M@ndoza', 'El nombre solo puede contener letras, espacios, apóstrofos, guiones y puntos.'],
    ["María-José O'Connor Muñoz", ''],
    ['Íñigo Peña-Ñúñez', '']
  ])('nombre "%s"', async (name, expected) => {
    const calls = captureSignUp()
    const { page } = await openPage('/register?type=user')
    await fill(page, { name })
    await submit(page)
    expect(fieldError(page, 'name-msg')).toBe(expected)
    if (expected) expect(calls).toHaveLength(0)
    else await waitFor(() => expect(calls).toHaveLength(1))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Correo y contraseña se validan antes de enviar (mismas reglas que el backend).
   * - ¿Qué hace?: Correo inválido, contraseña corta, sin números, sin letras y confirmación distinta.
   */
  it.each([
    [{ email: 'lucia@' }, 'email-error', 'Introduce un correo válido.'],
    [{ password: 'Abc123', confirm: 'Abc123' }, 'password-hint', 'Mínimo 8 caracteres, con al menos una letra y un número.'],
    [{ password: 'SoloLetras', confirm: 'SoloLetras' }, 'password-hint', 'Mínimo 8 caracteres, con al menos una letra y un número.'],
    [{ password: '12345678', confirm: '12345678' }, 'password-hint', 'Mínimo 8 caracteres, con al menos una letra y un número.'],
    [{ confirm: 'Distinta123' }, 'confirm-error', 'Las contraseñas no coinciden.']
  ])('campo inválido %o', async (overrides, id, expected) => {
    const calls = captureSignUp()
    const { page } = await openPage('/register?type=user')
    await fill(page, overrides)
    await submit(page)
    expect(fieldError(page, id)).toBe(expected)
    expect(calls).toHaveLength(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Los 409 deben mostrarse en su campo (DNI nuevo, correo y colegiatura).
   * - ¿Qué hace?: El backend responde 409 y se comprueba el mensaje bajo el campo correspondiente.
   */
  it.each([
    ['Ya existe una cuenta con este DNI', 'dni-msg', 'Ya existe una cuenta con este DNI.'],
    ['Ya existe una cuenta con este correo', 'email-error', 'Ya existe una cuenta con este correo.']
  ])('409 "%s" → campo', async (message, id, expected) => {
    captureSignUp(() => HttpResponse.json({ message }, { status: 409 }))
    const { page, router } = await openPage('/register?type=user')
    await fill(page)
    await submit(page)
    await waitFor(() => expect(fieldError(page, id)).toBe(expected))
    expect(router.currentRoute.value.name).toBe('Register')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El error de un campo del servidor debe desaparecer cuando el usuario lo corrige.
   * - ¿Qué hace?: 409 de DNI y luego se cambia el DNI → vuelve la ayuda del campo.
   */
  it('serverDniError_shouldClearWhenDniChanges', async () => {
    captureSignUp(() => HttpResponse.json({ message: 'Ya existe una cuenta con este DNI' }, { status: 409 }))
    const { page } = await openPage('/register?type=user')
    await fill(page)
    await submit(page)
    await waitFor(() => expect(fieldError(page, 'dni-msg')).toBe('Ya existe una cuenta con este DNI.'))
    await page.find('#dni').setValue('87654321')
    expect(fieldError(page, 'dni-msg')).toBe('Solo números: exactamente 8 dígitos, sin espacios.')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Todos los "errors" del 400 se muestran bajo su campo, incluidos los nuevos.
   * - ¿Qué hace?: El backend responde 400 con errores de dni, confirmPassword, acceptedPrivacyPolicy y fullName.
   */
  it('validation400_shouldMapEveryFieldError', async () => {
    captureSignUp(() => HttpResponse.json({
      message: 'Datos inválidos',
      errors: {
        fullName: ['Ingresa tu nombre y apellido'],
        dni: ['El DNI debe tener exactamente 8 dígitos numéricos'],
        confirmPassword: ['Las contraseñas no coinciden'],
        acceptedPrivacyPolicy: ['Debes aceptar la Política de Privacidad']
      }
    }, { status: 400 }))
    const { page } = await openPage('/register?type=user')
    await fill(page)
    await submit(page)
    await waitFor(() => expect(fieldError(page, 'dni-msg')).toBe('El DNI debe tener exactamente 8 dígitos numéricos'))
    expect(fieldError(page, 'name-msg')).toBe('Ingresa tu nombre y apellido')
    expect(fieldError(page, 'confirm-error')).toBe('Las contraseñas no coinciden')
    expect(fieldError(page, 'privacy-error')).toBe('Debes aceptar la Política de Privacidad')
    expect(page.find('[role="alert"]').text()).toContain('Revisa los campos marcados.')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Con demasiados intentos (429) no se debe seguir enviando.
   * - ¿Qué hace?: El backend responde 429 → mensaje general y botón de envío deshabilitado.
   */
  it('tooManyAttempts429_shouldShowMessageAndDisableSubmit', async () => {
    captureSignUp(() => HttpResponse.json({ message: 'Too many requests' }, { status: 429 }))
    const { page } = await openPage('/register?type=user')
    await fill(page)
    await submit(page)
    await waitFor(() => expect(page.find('[role="alert"]').text()).toContain('Demasiados intentos'))
    expect(page.find('button[type="submit"]').element.disabled).toBe(true)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: El registro de psicólogo debe enviar DNI, especialidad del catálogo y colegiatura de solo dígitos.
   * - ¿Qué hace?: Registra un psicólogo pegando "C.Ps.P. 45821" en la colegiatura (queda "45821") y verifica el
   *   payload y que termine en la pantalla de cuenta pendiente.
   */
  it('psychologistRegistration_shouldSendDniAndDigitsOnlyLicense', async () => {
    server.use(http.get(API + '/professionals/me', () => HttpResponse.json(pendingProfessional)))
    const calls = captureSignUp()
    const { page, router } = await openPage('/register?type=psychologist')
    await fill(page, { name: 'Elena Ramírez', dni: '87654321', email: 'elena@psico.pe' })
    await page.find('#specialty').setValue('clinical')
    await page.find('#license').setValue('C.Ps.P. 45821')
    expect(page.find('#license').element.value).toBe('45821')
    await submit(page)

    await waitFor(() => expect(router.currentRoute.value.name).toBe('ProStatus'))
    expect(calls[0]).toMatchObject({
      role: 'PSYCHOLOGIST', dni: '87654321', specialty: 'clinical', licenseNumber: '45821',
      acceptedTerms: true, acceptedPrivacyPolicy: true
    })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Especialidad y colegiatura son obligatorias para el psicólogo; la colegiatura solo admite dígitos.
   * - ¿Qué hace?: Sin especialidad y con colegiatura de letras (queda vacía) → dos errores y no se envía.
   */
  it('psychologistWithoutSpecialtyAndLetterLicense_shouldNotBeSent', async () => {
    const calls = captureSignUp()
    const { page } = await openPage('/register?type=psychologist')
    await fill(page, { name: 'Elena Ramírez', dni: '87654321', email: 'elena@psico.pe' })
    await page.find('#license').setValue('ABC')
    await submit(page)
    expect(page.text()).toContain('Selecciona una especialidad válida.')
    expect(fieldError(page, 'license-msg')).toBe('El número de colegiatura debe tener entre 3 y 6 dígitos.')
    expect(calls).toHaveLength(0)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: La colegiatura duplicada es un 409 que debe mostrarse en su campo.
   * - ¿Qué hace?: El backend responde 409 de colegiatura → mensaje bajo el campo colegiatura.
   */
  it('duplicateLicense409_shouldShowOnLicenseField', async () => {
    captureSignUp(() => HttpResponse.json({ message: 'Ya existe una cuenta con esta colegiatura' }, { status: 409 }))
    const { page } = await openPage('/register?type=psychologist')
    await fill(page, { name: 'Elena Ramírez', dni: '87654321', email: 'elena@psico.pe' })
    await page.find('#specialty').setValue('clinical')
    await page.find('#license').setValue('45821')
    await submit(page)
    await waitFor(() => expect(fieldError(page, 'license-msg')).toBe('Ese número de colegiatura ya está registrado.'))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué?: Cada casilla enlaza a su documento (textos legales existentes) y "acepto" marca solo esa casilla.
   * - ¿Qué hace?: Abre la Política de Privacidad, acepta, y comprueba que solo se marcó Privacidad.
   */
  it('privacyLink_shouldOpenPrivacyDocumentAndCheckOnlyPrivacy', async () => {
    const { page } = await openPage('/register?type=user')
    const link = page.findAll('button').find((b) => b.text() === 'Política de Privacidad')
    await link.trigger('click')
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog.textContent).toContain('Política de Privacidad')
    expect(dialog.textContent).toContain('Datos sensibles de salud')
    expect(dialog.textContent).not.toContain('Finalidad del servicio')
    ;[...dialog.querySelectorAll('button')].find((b) => b.textContent.includes('Entendido')).click()
    await waitFor(() => expect(page.find('#privacy').element.checked).toBe(true))
    expect(page.find('#terms').element.checked).toBe(false)
  })
})
