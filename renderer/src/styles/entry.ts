/**
 * The one thing the browser loads.
 *
 * <p>PatternFly's stylesheet, then this site's own, then the behaviour. Order matters:
 * the documentation's rules override PatternFly's, never the other way round.
 */
import '@patternfly/patternfly/patternfly.css';
import '@patternfly/patternfly/patternfly-addons.css';
import './docs.css';
import '../scripts/enhance.ts';
