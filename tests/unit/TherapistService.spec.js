// Pruebas unitarias: directorio de psicólogos y reseñas (src/services/TherapistService.js)
import { http, HttpResponse } from 'msw'
import { server, API } from '../mocks/server.js'
import { TherapistService } from '../../src/services/TherapistService.js'

describe('TherapistService', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Regla principal del negocio: solo psicólogos con colegiatura verificada
   *   pueden aparecer para los pacientes.
   * - ¿Qué hace esta prueba?: La API devuelve uno verificado y uno pendiente; verifica que solo quede el verificado.
   */
  it('directory_shouldOnlyShowVerifiedPsychologists', async () => {
    // Act
    const list = await new TherapistService().getTherapists()

    // Assert
    expect(list.map((p) => p.name)).toEqual(['Dra. Elena Ramírez'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Un paciente no debe ver ni reservar con un psicólogo no verificado aunque
   *   escriba la dirección directamente.
   * - ¿Qué hace esta prueba?: Pide el perfil del psicólogo pendiente y verifica que se lance un error 404.
   */
  it('pendingPsychologistProfile_shouldBeTreatedAsNotFound', async () => {
    // Act + Assert
    await expect(new TherapistService().getTherapist(200)).rejects.toMatchObject({ status: 404 })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: La valoración del psicólogo debe estar entre 1 y 5 estrellas.
   * - ¿Qué hace esta prueba?: Envía una reseña con 7 estrellas y verifica que llegue como 5, con su cita y comentario.
   */
  it('reviewRating_shouldBeLimitedBetweenOneAndFive', async () => {
    // Arrange
    let body = null
    server.use(http.post(API + '/professionals/:id/reviews', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ id: 1 })
    }))

    // Act
    await new TherapistService().addReview(1, { appointmentId: 502, rating: 7, comment: ' Muy útil ' })

    // Assert
    expect(body).toEqual({ appointmentId: 502, rating: 5, comment: 'Muy útil' })
  })
})
