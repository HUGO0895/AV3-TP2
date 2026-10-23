/** Erros de domínio com o código HTTP correspondente. */
export class ErroDominio extends Error {
  constructor(mensagem: string, public readonly codigoHttp: number = 422) {
    super(mensagem);
    this.name = new.target.name;
  }
}

export class ErroValidacao extends ErroDominio {
  constructor(mensagem: string) {
    super(mensagem, 400);
  }
}

export class ErroNegocio extends ErroDominio {
  constructor(mensagem: string) {
    super(mensagem, 422);
  }
}

export class ErroServicoIndisponivel extends ErroDominio {
  constructor(mensagem: string) {
    super(mensagem, 503);
  }
}
