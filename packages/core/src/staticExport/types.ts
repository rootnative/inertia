/** Options for `entranceGuardCss`. */
export interface EntranceGuardOptions {
  /**
   * How long to wait for the bundle before revealing the page anyway, in
   * milliseconds. Default `4000`.
   *
   * The value is a judgement about the slowest connection worth serving, not a
   * performance target. Too short and a slow-but-working page flashes its
   * content into place before the animation runs; too long and a visitor whose
   * bundle failed stares at nothing.
   */
  timeoutMs?: number
}
