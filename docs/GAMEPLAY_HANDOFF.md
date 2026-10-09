# Nico's City Entrepreneur Game — Gameplay Handoff

(Received in chat on 2026-10-09 and saved here verbatim apart from markdown headings.)

Version 1.0 · October 9, 2026
Working title: Big Dreams, Small Beginnings (proposed; not approved)

## Purpose and decision status

This document hands off the game's premise, activities, progression, and business systems to a designer or development team. It excludes artwork, animation specifications, engine selection, hosting, and technical architecture.

Confirmed means explicitly requested by Matthew or Nico in the concept discussion. Proposed means a design recommendation or illustrative example that still needs approval. Proposed details should not silently become requirements. This is a concept and systems handoff, not a fully balanced design document.

## 1. The game in one paragraph

You start in a big city with ambitious ideas for toys, robots, and furniture, but little money and no established business. You take side hustles—taxi driving, house cleaning, construction work, and buying abandoned storage units to resell their contents—to raise capital. Each side hustle is a playable minigame. You invest your earnings in tools and equipment, build prototypes, and eventually sell your own products. As your business grows, you rent and later buy factories and storefronts, hire workers and salespeople, buy machines, plan automation, market your goods, and train managers. Your company becomes increasingly capable of operating without your constant involvement, while the city continues to offer enjoyable hands-on activities.

Player promise: Start with almost nothing, make things people want, and build a company that brings your ideas to life.

## 2. Confirmed foundations

- The setting is a large city layout with a dump, houses, and different businesses.
- The player dreams of becoming a successful entrepreneur.
- Product interests include toys, robots, and furniture; the player can choose what to make.
- The opening phase centers on side hustles to raise startup capital.
- Side hustles are minigames, including taxi driving, house cleaning, construction work, and storage-unit flipping.
- Earnings buy equipment used to make prototypes, which lead to products the player can sell.
- Progression includes renting and eventually buying factories and storefronts.
- Factories support different levels of automation, including conveyors and presses.
- Planning production and automation is a major gameplay phase.
- Business growth includes hiring workers, buying equipment, marketing goods, training managers, and hiring salespeople.
- Work that has not been automated or assigned to someone else should have a hands-on minigame representation.
- Minigames must remain available and worthwhile after automation.
- Satisfactory is an inspiration for production planning and the satisfaction of automation. Its exact rules, scale, and camera are not requirements.
- PC and iPad are intended play devices. The current direction is a web app; this document leaves implementation decisions to a separate handoff.

## 3. Core gameplay loops

**Starting loop — confirmed structure**

Choose a side hustle → play its minigame → earn money → buy tools or equipment → work toward a prototype.

**Product loop — confirmed structure**

Choose a product idea → acquire the necessary resources and equipment → build and test a prototype → make sellable units → sell them → reinvest.

**Business loop — confirmed structure**

Find demand → plan production → acquire premises, equipment, and staff → produce goods → reach customers → collect revenue → improve or expand.

**Continuing hands-on loop — proposed implementation**

While routine production is handled by workers and machines, the player can develop another prototype, play side hustles, search storage units, salvage parts, or fulfill a special order. Automated income supports new projects rather than eliminating all active play.

## 4. The city as a playable place

The city connects the game's activities. It should provide meaningful destinations and opportunities rather than function only as a decorative map.

|Location               |Confirmed role or presence                                |Proposed gameplay use                                                               |
|-----------------------|----------------------------------------------------------|------------------------------------------------------------------------------------|
|Houses                 |Present in the city; house cleaning is a side hustle      |Cleaning jobs, delivery destinations, household customers, custom furniture requests|
|Businesses             |Different businesses exist                                |Suppliers, job providers, commercial customers, retail partners                     |
|Dump                   |Present in the city                                       |Search for usable parts, repairable objects, and cheap prototype materials          |
|Storage units          |Buying abandoned units and flipping goods is a side hustle|Inspect auction lots, buy contents, identify items, repair or resell them           |
|Workshops and factories|Rent and eventually buy production premises               |Space for equipment, workers, stock, and production lines                           |
|Storefronts            |Rent and eventually buy retail premises                   |Display goods, sell directly, hire salespeople                                      |
|Streets                |Implied by the city and taxi activity                     |Travel, taxi routes, pickups, deliveries                                            |

Proposed connection: Jobs introduce people and opportunities. A cleaning customer might mention a furniture need; a construction contact might offer a supply source; a storage unit might contain parts for a robot. These links should supplement paid jobs, not require playing every hustle to unlock the business.

The city's exact size, district structure, travel method, and camera remain open decisions. A small playable neighborhood is a suggested starting scope, not a reduction of the eventual city concept.

## 5. Side hustles

All four activities below are confirmed. Their detailed mechanics are proposed.

|Hustle               |Proposed minigame                                                                                          |Proposed earning and progression connection                               |
|---------------------|-----------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
|Taxi driving         |Pick up a passenger, follow a route, navigate traffic, reach the destination                               |Fare plus a performance bonus; explore the city and meet contacts         |
|House cleaning       |Select suitable tools, clean surfaces, sort clutter, finish a checklist                                    |Job payment; learn about household needs and meet customers               |
|Construction work    |Complete a bounded task such as measuring, placing components, or assembling a structure                   |Job payment; learn tool interactions and discover suppliers               |
|Storage-unit flipping|Inspect visible clues, choose whether to buy, open the unit, sort its contents, assess resale opportunities|Profit from selling or repairing finds; keep useful materials or equipment|

Proposed design rules:

- Each job has a clear objective, short playable session, and understandable payout.
- Different hustles should involve different actions and decisions.
- Early jobs should help the player afford an initial tool purchase without a long repetitive grind.
- Skill can improve earnings; ordinary completion should still feel worthwhile.
- Explain purchase costs and uncertainty before a storage-unit bid. Do not make an unseen mandatory loss the opening tutorial.
- Keep all hustles accessible later for enjoyment, extra earnings, or useful discoveries.

Failure penalties, job availability, timers, vehicle ownership, auction rules, and exact payouts need a separate design pass.

## 6. Ideas, prototypes, and products

Confirmed: The player has ideas, buys equipment, builds prototypes, chooses what to make, and eventually sells products.

Proposed product-development sequence:

1. Select an idea from an available catalog.
2. Review its required tools, parts, and expected production steps.
3. Gather materials through purchase, salvage, or useful finds.
4. Build the prototype through hands-on tasks.
5. Test its function or quality in a product-specific minigame.
6. Complete the design and unlock repeatable production.
7. Make a first batch and find buyers.

Use recognizable designs with a few meaningful variants as an initial approach. Unlimited freeform invention is not a confirmed requirement.

|Product family|Proposed distinguishing features                            |Illustrative product                          |
|--------------|------------------------------------------------------------|----------------------------------------------|
|Toys          |Simple early assembly, small batches, variations            |Pull-along toy, toy car, moving mechanical toy|
|Furniture     |Larger materials and storage needs, finishing, custom orders|Stool, chair, shelf                           |
|Robots        |More components, functional testing, longer development     |Helper robot or delivery robot                |

These examples do not establish a mandatory toy → furniture → robot progression. Product-family unlock order remains open.

A prototype should feel like creating something new. Once its design works, repeat production should use a shorter manual routine or delegated production; the player should not need to rediscover the design for every unit.

## 7. From manual work to automation

Confirmed: Production starts with direct work and expands into workers, equipment, conveyors, presses, and automation planning.

Proposed progression:

- Manual: The player performs production tasks through minigames.
- Staffed: Workers take responsibility for assigned tasks and stations.
- Mechanized: Equipment increases capacity or automates particular operations.
- Connected: Conveyors connect suitable stations and reduce carrying work.
- Managed: Managers coordinate routine operations within player-defined limits.

These levels can coexist in the same factory. A press may be automated while assembly remains staffed and prototype development remains manual.

Illustrative toy chain:

Raw material → cut or press components → assemble → finish → package → stock for sale.

The exact chain depends on the chosen product. Do not force every item through the same stations.

Proposed planning decisions: placement, station capacity, recipe requirements, worker assignment, material storage, conveyor routing, and output destinations. The player should be able to identify why a line stopped: missing input, occupied output storage, unstaffed station, or insufficient downstream capacity.

Automation must remove work in a noticeable way. Avoid making the player repeatedly solve a maintenance minigame merely to keep purchased automation functional.

## 8. Premises and expansion

Confirmed: The player can rent and eventually buy factories and storefronts.

Proposed distinctions:

- A starter workspace supports prototypes and small batches.
- A rented workshop offers more space with an ongoing cost.
- A factory supports larger production layouts and more staff.
- A storefront provides a dedicated selling location.
- Ownership is a substantial investment with a clear benefit relative to renting.

Premises could differ in size, location, delivery access, and customer reach. The exact property economy—rent timing, purchase prices, whether buildings can be upgraded, and consequences of missed payments—is undecided.

Do not assume the player must own a storefront before making the first sale; early direct sales are a proposed way to make product development pay off sooner.

## 9. Employees and management

All roles below are confirmed; their specific responsibilities are proposed.

|Role       |Proposed responsibilities                                                    |What it frees the player to do              |
|-----------|-----------------------------------------------------------------------------|--------------------------------------------|
|Worker     |Operate assigned stations, assemble products, handle materials               |Develop products or perform other activities|
|Salesperson|Serve retail customers or pursue suitable orders                             |Focus on production and expansion           |
|Manager    |Coordinate staffing and supplies at a site, follow budgets, report exceptions|Run another location or pursue a new venture|

Training should have understandable effects, such as handling more stations, managing a larger team, or coordinating replenishment more effectively. Hiring and wages need visible costs. Manager autonomy needs explicit settings; managers should not make unlimited purchases or redesign factories without permission.

Staffing schedules, morale, individual traits, payroll timing, and training costs are open decisions.

## 10. Customers, sales, and marketing

Confirmed: The player makes things people want, sells products, markets goods, and employs salespeople.

Proposed sales structure: Early individual buyers lead into storefront sales and commercial orders. Customers can request different product types or quantities, giving the player reasons to diversify.

Marketing should create a visible opportunity to sell more. The player should understand the campaign cost, intended audience, and resulting demand. Production capacity and stock must matter: more interested customers do not automatically mean more profit.

Show revenue, material spending, wages, premises costs, and remaining cash clearly enough to support investment decisions. Exact prices, demand formulas, competition, reputation, delivery rules, refunds, and deadlines are not yet agreed.

## 11. Progression and continued play

The broad journey is confirmed:

Side hustles → prototypes → first sales → rented business premises → staff and equipment → factory automation → management and expansion → property ownership and a successful company.

Treat these as overlapping stages. Side hustles remain available, prototyping continues, and manual work can coexist with automated production.

Proposed pacing priority: Let the player make and sell a first product early. Bigger factories can be long-term goals, but creating something should not be hidden behind hours of startup grinding.

Proposed later-game activities: new product development, custom commissions, storage-unit hunting, better factory layouts, new storefronts, and expansion into underserved customer needs. The final success condition, campaign length, and any sandbox continuation remain undecided.

## 12. Suggested first playable slice

This scope is proposed, not an approved full-game specification.

- One small city neighborhood with a house, job provider, supplier, dump, and rentable workshop.
- Two side hustles: house cleaning and storage-unit flipping.
- One product with a prototype-building and testing sequence.
- An initial direct sale and repeatable small-batch production.
- One worker and one automated production step, including a short conveyor connection.
- A clear reason to keep playing a minigame after automation starts.

**Acceptance criteria**

A new player can earn startup money, buy equipment, complete a prototype, sell units, rent a workspace, delegate one task, and see an automated step contribute to production. Costs and progress are understandable. The player can explain what the next investment will change. Earlier activities remain playable.

Taxi driving, construction, property ownership, multiple product families, marketing, managers, and a full storefront can follow once this complete journey works; all remain part of the intended broader game.

## 13. Decisions for the next design pass

1. How does the player move around and interact with the city?
2. What is the first product, and how freely can products be customized?
3. Which side hustles lead the opening, and how quickly should the first sale happen?
4. What distinguishes worker-operated equipment from fully automatic machinery?
5. How detailed should conveyor layout and production planning become?
6. How do rent, wages, and demand advance with time? What happens while the game is closed?
7. What are the consequences of a failed job, unsuccessful product, or poor investment?
8. What orders and selling channels exist before the first storefront?
9. What can managers do autonomously, and what requires the player?
10. What does becoming a successful entrepreneur mean as a campaign goal?

No multiplayer, monetization model, offline earnings, bankruptcy system, or unrestricted invention editor has been approved. Resolve those deliberately rather than treating them as implied by the genre.

## 14. Direction for the receiving team

Preserve the complete journey from city side hustles to creating products and operating a growing business. Make each investment change how the player spends their time. Give hands-on activities a continuing purpose after automation. Use the proposed slice to test the core experience, then return with explicit decisions and evidence before expanding into a large city and a complex business economy.
