"""helpers for the Ultra Boots Hallway Close Call study (run from /tmp/claude-0/pm/hwub)."""
from emu import *
from pm import *
from btl import *
from rngsim import *

STATE_BOMB = 'states/boss_2302_bomb_menu.st'     # see README: Bombette Super, Ultra Boots, 10 HP / 10 FP, 7 spirits
STATE_LAKI = 'states/boss_2302_route_menu.st'    # rngtool README: Lakilester Super, Ultra Boots, 10 HP / 15 FP
CC_RA = 0x80277518                                # Close Call rand_int(100) caller (EnemyTestTarget)


def mario_hp(e): return (e.s8(PLAYER_DATA + 2), e.s8(PLAYER_DATA + 5))


def actor(e, off): return e.u32(BSTATUS + off)        # 0xD8 player, 0xDC partner, 0xE0 first enemy


def bowser_status(e):
    """(debuff, debuffDuration) of Bowser (Actor 0x210 / 0x211)"""
    a = actor(e, 0xE0)
    return (e.s8(a + 0x210), e.s8(a + 0x211)) if a else None


def row_values(row):
    """[(name, max, value)] for one logged frame, replaying its draws from the frame's start seed"""
    s = row['s0']; out = []
    for nm, mx in row['d']:
        s, v = rand_int(s, mx); out.append((nm, mx, v))
    return out, s == row['s1']


def rolls_after(r, f0, names=None):
    """every non-coin, non-step draw from frame f0 on: (frame - f0, name, max, value)"""
    out = []
    for row in r.rows[f0:]:
        vals, ok = row_values(row)
        for nm, mx, v in vals:
            if nm in ('step', 'coin'): continue
            if names and nm not in names: continue
            out.append((row['f'] - f0, nm, mx, v if ok else None))
    return out
