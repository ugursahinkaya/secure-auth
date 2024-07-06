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
    super(operations);
    this.authLogger = new Logger("secure-auth", logLevel);
    const fetchApiOperations = {
      ...operations,
      readyToFetch: () => {
        this.call("loginOrRegister");
      },
    } as SecureFetchApiOperations;

    this.api = new SecureFetch(authUrl, fetchApiOperations, logLevel);
  }
  async refresh(token: string) {
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
    return this.api.fetch(`${this.authUrl}/register`, {
      userName,
      firstName,
      lastName,
      password,
      password2,
    });
  }
  async changePassword(userName: string, password: string, password2: string) {
    return this.api.fetch(`${this.authUrl}/changePassword`, {
      userName,
      password,
      password2,
    });
  }
  async validate(userName: string, smsToken: string, validationToken: string) {
    return this.api.fetch(`${this.authUrl}/validate`, {
      userName,
      smsToken,
      validationToken,
    });
  }
  async whoIs(queryToken: string) {
    return await this.api.fetch(`${this.authUrl}/getUserData`, {
      userQueryToken: queryToken,
    });
  }
  async checkUserName(userName: string, register: boolean) {
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
    await this.api.fetch(`${this.authUrl}/logout`, {});
    await this.call("loggedOut", { channel: "rest", secure: true });
    this.authLogger.debug("logged out");
  }
  async login(userName: string, password: string) {
    const loginRes = await this.api.fetch(`${this.authUrl}/login`, {
      userName,
      password,
    });
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
