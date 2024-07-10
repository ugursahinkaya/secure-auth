import { GenericRouter } from "@ugursahinkaya/generic-router";
import { SecureFetch } from "@ugursahinkaya/secure-fetch";
import {
  SecureFetchApiOperations,
  LogLevel,
} from "@ugursahinkaya/shared-types";
import { Logger } from "@ugursahinkaya/logger";

export class SecureAuth<
  TOperations extends SecureFetchApiOperations,
> extends GenericRouter<TOperations> {
  protected api: SecureFetch<SecureFetchApiOperations>;
  protected authLogger: Logger;
  constructor(
    public authUrl: string,
    operations: TOperations,
    logLevel?: LogLevel
  ) {
    super(operations, logLevel);
    this.authLogger = new Logger("secure-auth", logLevel);
    const fetchApiOperations = {
      ...operations,
      readyToFetch: () => {
        this.authLogger.debug("readyToFetch", "fetchApiOperations");

        this.call("loginOrRegister");
      },
    } as SecureFetchApiOperations;

    this.api = new SecureFetch(authUrl, fetchApiOperations, logLevel);
  }
  async refresh(token: string) {
    this.authLogger.debug(token, "refresh");

    return this.api.refresh(token);
  }
  queryTokenValue() {
    return this.api.queryTokenValue();
  }
  async resetPassword(userName: string) {
    return this.api.fetch(`${this.authUrl}/resetPassword`, { userName });
  }
  async register(
    userName: string,
    firstName: string,
    lastName: string,
    password: string,
    password2: string
  ) {
    this.authLogger.debug(userName, "register");
    return this.api.fetch(`${this.authUrl}/register`, {
      userName,
      firstName,
      lastName,
      password,
      password2,
    });
  }
  async changePassword(userName: string, password: string, password2: string) {
    this.authLogger.debug(userName, "changePassword");

    return this.api.fetch(`${this.authUrl}/changePassword`, {
      userName,
      password,
      password2,
    });
  }
  async validate(userName: string, smsToken: string, validationToken: string) {
    this.authLogger.debug(userName, "validate");

    return this.api.fetch(`${this.authUrl}/validate`, {
      userName,
      smsToken,
      validationToken,
    });
  }
  async whoIs(queryToken: string) {
    this.authLogger.debug(queryToken, "whoIs");

    return await this.api.fetch(`${this.authUrl}/getUserData`, {
      userQueryToken: queryToken,
    });
  }
  async checkUserName(userName: string, register: boolean) {
    this.authLogger.debug(userName, `checkUserName register:${register}`);

    const res = await this.api.fetch(`${this.authUrl}/checkUserName`, {
      userName,
      register,
    });
    if (res.data === "invalid_user") {
      delete res.data;
      res.error = "Hatalı kullanıcı adı";
      this.authLogger.debug(res.error, "checkUserName");
    }
    return res;
  }
  async logout() {
    this.authLogger.debug("", `logout`);

    await this.api.fetch(`${this.authUrl}/logout`, {});
    await this.call("loggedOut", { channel: "rest", secure: true });
    this.authLogger.debug("logged out", `logout`);
  }
  async login(userName: string, password: string) {
    this.authLogger.debug(userName, `login`);

    const loginRes = await this.api.fetch(`${this.authUrl}/login`, {
      userName,
      password,
    });
    this.authLogger.debug(loginRes, [`login`, "reslut"]);

    if (loginRes.error) {
      await this.call(
        "loginError",
        { channel: "rest", secure: true },
        loginRes.error
      );
      this.authLogger.error(loginRes.error, "login");

      return loginRes;
    }
    if (loginRes.queryToken) {
      await this.call("loggedIn", loginRes.queryToken);
    }

    if (loginRes.process) {
      await this.call(
        loginRes.process,
        { channel: "rest", secure: true },
        loginRes
      );
      this.authLogger.debug(loginRes.process, ["login", "process"]);
    }
    return loginRes;
  }
}
