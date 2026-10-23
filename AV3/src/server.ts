import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import { ErroDominio } from "./erros";
import {
    projetoConvite, projetoRecomendacao, projetoSubstituicao, RecomendacaoController,
} from "./controller/recomendacaoController";
import ServiceRecomendacao from "./servico/ServiceRecomendacao";
import RegistroFabricas from "./Fabricas/RegistroFabricas";

/** Monta o servidor HTTP recebendo as dependências (sem banco, testável com app.inject). */
export function construirServidor(service: ServiceRecomendacao, opcoes: FastifyServerOptions = { logger: true }, registro: RegistroFabricas = RegistroFabricas.padrao()): FastifyInstance {
    const app = fastify(opcoes)
    const controller = new RecomendacaoController(service, registro)

    app.get('/saude', async () => ({ status: 'ok' }))
    app.post('/', { schema: projetoRecomendacao }, controller.recomendar)
    app.post('/equipe/substituir', { schema: projetoSubstituicao }, controller.substituir)
    app.post('/convites/responder', { schema: projetoConvite }, controller.responderConvite)

    app.setErrorHandler((erro: any, request, reply) => {
        if (erro instanceof ErroDominio) {
            return reply.status(erro.codigoHttp).send({ status: 'error', mensagem: erro.message })
        }
        if (erro.validation) {
            return reply.status(400).send({ status: 'error', mensagem: erro.message })
        }
        request.log.error(erro)
        return reply.status(500).send({ status: 'error', mensagem: 'Erro interno' })
    })

    return app
}
