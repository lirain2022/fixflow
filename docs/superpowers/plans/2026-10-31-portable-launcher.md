# Portable Windows launcher

User requested publishing current updates, then a simple launcher available with a GitHub download and outside the project folder. Existing updates pushed as ecbee50. Implement inline using executing-plans, retaining this isolated feature checkout.

Design: root 開啟系統.cmd, 關閉系統.cmd and 建立桌面捷徑.cmd call repository-relative PowerShell scripts. Desktop shortcut points at the extracted project. Require Java 21 JDK and Node >=24.15; locate normal installed tools, use Maven wrapper when Maven absent. First launch npm ci; rerun when lockfile changes. Start hidden backend/frontend workers, verify both HTTP endpoints and open homepage. Track worker process identity and descendants; stop only these processes. Refuse occupied ports owned by another run/project. Keep data in project data/, state/logs in ignored .fixflow/. No dependency on Codex folders.

Alternative: shipping a compiled app would require bundling runtimes and release packaging; simple two-terminal instructions already confuse the user. Use a repository launcher plus optional desktop shortcut. Do not claim zero prerequisites or that GitHub includes local accounts/database.

- [x] Behavioral checks: relocated/spaced paths, port conflict before spawning, npm failure, worker identity mismatch, descendant stop selection, current tool detection.
- [x] Implement launcher, worker and root entry points; rewrite outdated README entry/role guidance; first-download guide.
- [ ] Syntax + behavior tests, fresh-path startup smoke check, final review; commit and push without force, verify remote SHA. Preserve original C:/Projects/taskflow and its data.

Verification: launcher behavior tests and prerequisite check pass. Fresh archive extracted to a path with spaces correctly locates scripts and tools. Initial npm failure leaves no dependency stamp or services. With a writable cache npm installs successfully and Vite starts. Full local Maven launch is blocked by sandbox AccessDeniedException while closing compiler JARs; taskkill tree cleanup is also denied by this environment. Test-owned Node and PowerShell processes were identified by PID/name/start time and stopped; ports confirmed free. Added Windows CI to exercise actual first/repeated launch and stop in a normal Windows runner. Do not treat local smoke as passed.

Final review: fresh reviewer found two Important defects. Copied runtime state could control the original project; added root identity and test RED→GREEN. Desktop errors disappeared; added PauseOnError to shortcut invocation and test RED→GREEN. JDK shim discovery limitation is covered by JAVA_HOME setup instructions.

GitHub CI on ecbee50: backend/frontend checks passed, browser checks 30/31; quote scenario had a hardcoded local port 16175. Replaced with Playwright baseURL fixture so the same test uses configured local/CI origin. New CI run will verify this correction.
