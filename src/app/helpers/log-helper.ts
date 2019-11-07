export class LogHelper {

  // TODO: MOCK!!!!
  public static trace(text: any) {
    console.log(text);
  }

  public static logError(status: number = 0, text: string) {
    console.error(text);
  }
}
